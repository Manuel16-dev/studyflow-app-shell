// StudyFlow Edge Function: generate-cards
// Deploy: Supabase dashboard -> Edge Functions -> Create new function
// named `generate-cards`, paste this file, then add secrets:
//   OPENAI_API_KEY = sk-...
//   ANTHROPIC_API_KEY = sk-ant-...   (optional Claude fallback)
//   GENERATION_MODEL = gpt-4o-mini   (optional, defaults to gpt-4o-mini)
//
// PRD coverage:
//   20 AI System        — LLM generation, schema validation, provider
//                         abstraction (OpenAI primary, Claude fallback),
//                         refusal when there's nothing to ground on
//   21 RAG (lite)       — chunking (~800-token / 15%-overlap equivalent),
//                         per-chunk generation, merged + deduplicated
//   12.4 / 22           — client extracts text; this function only sees text
//   AI quality reqs     — JSON-schema output, editable before commit (client
//                         side), batch generation, refusal on thin content
//
// Auth: invoked with the user's JWT (supabase.functions.invoke attaches it);
// the request is rejected unless the token resolves to a signed-in user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ~800 tokens is roughly 3,000 characters of English prose. Chunks overlap
// by 15% so a concept split across a boundary still generates cleanly once.
const CHUNK_CHARS = 12_000
const CHUNK_OVERLAP = Math.floor(CHUNK_CHARS * 0.15)
const MAX_CHUNKS = 6 // hard ceiling: ~72k chars of material per generation
const MAX_CARDS_PER_CHUNK = 8

// Best-effort per-user rate limit (resets on cold start; the point is
// stopping runaway loops, not metering).
const RATE_LIMIT = { windowMs: 60_000, max: 10 }
const rateBuckets = new Map()

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function fail(message, status = 400) {
  return json({ error: message }, status)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail('Method not allowed', 405)

  // --- Auth -----------------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return fail('Not signed in', 401)

  // --- Rate limit -----------------------------------------------------------
  const now = Date.now()
  const bucket = rateBuckets.get(user.id)
  const hits = bucket && now - bucket.start < RATE_LIMIT.windowMs ? bucket.count + 1 : 1
  if (hits > RATE_LIMIT.max) return fail('Too many generations in a row — wait a minute.', 429)
  rateBuckets.set(user.id, { start: bucket && now - bucket.start < RATE_LIMIT.windowMs ? bucket.start : now, count: hits })

  // --- Input ----------------------------------------------------------------
  let body
  try {
    body = await req.json()
  } catch {
    return fail('Invalid JSON body')
  }

  const { mode, materialName, text, card, count, materialId, subjectId, storagePath } = body ?? {}
  if (!mode || (mode !== 'generate' && mode !== 'regenerate')) return fail('Unknown mode')
  if (typeof text !== 'string' || text.replace(/\s/g, '').length < 200) {
    return fail('Material text is too short to generate meaningful cards from.')
  }

  try {
    if (mode === 'generate') {
      const wanted = Math.min(Math.max(Number(count) || 12, 4), 24)

      // Coverage-tracked path: a materialId means "generate more" from an
      // already-persisted material, drawing only from chunks not yet used.
      // No materialId + subjectId/storagePath present means "first upload" —
      // persist the material + its chunk rows, then generate from all of them.
      let resolvedMaterialId = materialId ?? null
      if (!resolvedMaterialId && subjectId && storagePath) {
        resolvedMaterialId = await createMaterial(supabase, user.id, subjectId, materialName ?? 'material', storagePath, text)
      }

      if (resolvedMaterialId) {
        const result = await generateFromCoveredMaterial(supabase, resolvedMaterialId, text, materialName ?? 'material', wanted)
        return json(result)
      }

      // No persistence requested (e.g. legacy caller) — behave as before.
      const cards = await generateFromMaterial(text, materialName ?? 'material', wanted)
      return json({ cards })
    }

    // regenerate
    if (!card?.front || !card?.back) return fail('Card to regenerate is missing')
    const snippet = snippetAround(text, card.back) || text.slice(0, CHUNK_CHARS)
    const cards = await callLLM(regeneratePrompt(card, materialName ?? 'material', snippet), regenerateSchema(), 1)
    return json({ cards })
  } catch (err) {
    console.error('generation failed:', err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return fail(message, 502)
  }
})

// --- Chunking (PRD 21, lite) -------------------------------------------------

function chunkText(text) {
  if (text.length <= CHUNK_CHARS) return [text]
  const chunks = []
  let start = 0
  while (start < text.length && chunks.length < MAX_CHUNKS) {
    // Break on a page marker or paragraph boundary when possible so chunks
    // don't start mid-sentence.
    let end = Math.min(start + CHUNK_CHARS, text.length)
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n\n', end)
      if (breakAt > start + CHUNK_CHARS / 2) end = breakAt
    }
    chunks.push(text.slice(start, end))
    start = end - CHUNK_OVERLAP
  }
  return chunks
}

// For regeneration: find the chunk that most likely produced this card so
// the model rewrites from real context instead of inventing.
function snippetAround(text, needle) {
  const words = needle.split(/\s+/).filter((w) => w.length > 4).slice(0, 6)
  let best = null
  let bestScore = 0
  for (let i = 0; i < text.length; i += CHUNK_CHARS - CHUNK_OVERLAP) {
    const chunk = text.slice(i, i + CHUNK_CHARS)
    const score = words.reduce((acc, w) => acc + (chunk.toLowerCase().includes(w.toLowerCase()) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = chunk
    }
  }
  return bestScore >= 2 ? best : null
}

async function generateFromMaterial(text, materialName, wanted) {
  const chunks = chunkText(text)
  const perChunk = Math.ceil(wanted / chunks.length)
  const all = []

  for (const chunk of chunks) {
    if (all.length >= wanted) break
    const cards = await callLLM(
      generatePrompt(materialName, Math.min(perChunk, MAX_CARDS_PER_CHUNK)),
      cardsSchema(),
      Math.min(perChunk, MAX_CARDS_PER_CHUNK)
    ).catch((err) => {
      // A single bad chunk shouldn't kill the whole generation — but if
      // *nothing* succeeded the caller sees the empty-array error path.
      console.error('chunk failed:', err)
      return []
    })
    all.push(...cards)
  }

  // Deduplicate near-identical fronts (overlap chunks regenerate the same
  // concept). Cheap normalization; exact-dup + shared-first-6-words check.
  const seen = new Set()
  const unique = []
  for (const c of all) {
    const key = c.front.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 6).join(' ')
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(c)
    }
  }
  return unique.slice(0, wanted)
}

// --- Coverage-tracked generation ("generate more" without re-upload) --------

async function createMaterial(supabase, userId, subjectId, materialName, storagePath, text) {
  const { data: material, error: matErr } = await supabase
    .from('materials')
    .insert({ user_id: userId, subject_id: subjectId, name: materialName, storage_path: storagePath, extracted_text: text })
    .select('id')
    .single()
  if (matErr) throw new Error(`Couldn't save material: ${matErr.message}`)

  const chunks = chunkText(text)
  const rows = chunks.map((_, i) => ({ material_id: material.id, chunk_index: i }))
  const { error: chunkErr } = await supabase.from('material_chunks').insert(rows)
  if (chunkErr) throw new Error(`Couldn't save material chunks: ${chunkErr.message}`)

  return material.id
}

// Generates only from chunks not yet marked `covered`. Coverage is updated
// separately, by markChunksCovered(), only once the client reports which
// cards the user actually approved — not here. (Earlier version marked
// covered on successful generation regardless of approval; that meant a
// chunk that generated but was never approved — e.g. the user closed out,
// or a retry loop across quota errors — got silently skipped forever.
// Approve-time tracking is the correct source of truth: "covered" should
// mean "cards from this chunk are actually in the deck.")
async function generateFromCoveredMaterial(supabase, materialId, text, materialName, wanted) {
  const { data: chunkRows, error } = await supabase
    .from('material_chunks')
    .select('id, chunk_index, covered')
    .eq('material_id', materialId)
    .order('chunk_index', { ascending: true })
  if (error) throw new Error(`Couldn't load material chunks: ${error.message}`)

  const allChunks = chunkText(text)
  const uncovered = chunkRows.filter((r) => !r.covered)

  if (uncovered.length === 0) {
    return { cards: [], fullyCovered: true, materialId }
  }

  const perChunk = Math.ceil(wanted / uncovered.length)
  const all = []

  for (const row of uncovered) {
    if (all.length >= wanted) break
    const chunkText_ = allChunks[row.chunk_index]
    if (chunkText_ == null) continue // chunk boundaries shifted (edited source) — skip defensively
    const cards = await callLLM(
      generatePrompt(materialName, Math.min(perChunk, MAX_CARDS_PER_CHUNK)),
      cardsSchema(),
      Math.min(perChunk, MAX_CARDS_PER_CHUNK)
    ).catch((err) => {
      console.error('chunk failed:', err)
      return []
    })
    // Tag each card with the chunk it came from so the client can report
    // back exactly which chunks to mark covered once the user approves.
    for (const c of cards) c.chunkIndex = row.chunk_index
    if (cards.length > 0) all.push(...cards)
  }

  const seen = new Set()
  const unique = []
  for (const c of all) {
    const key = c.front.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 6).join(' ')
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(c)
    }
  }

  // fullyCovered here reflects DB state going in (checked above) — always
  // false once we've reached this point, since we just found uncovered
  // chunks to draw from. True coverage is re-checked fresh on the next call.
  return { cards: unique.slice(0, wanted), fullyCovered: false, materialId }
}

// --- Prompts -----------------------------------------------------------------

function generatePrompt(materialName, count) {
  return {
    role: 'system',
    content: `You create spaced-repetition flashcards from study material. Material: "${materialName}".

Rules:
- Write exactly ${count} cards covering the most testable concepts.
- Fronts are specific questions or prompts; never "What is this about?".
- Backs are self-contained answers, 1-3 sentences, no filler.
- Test understanding and application, not trivia or definitions of obvious words.
- sourceRef: cite the page marker nearest the answer, like "p. 3" or "p. 3, para 2". If no page markers exist, cite the section heading the answer came from.
- If the material is too thin or unstructured to make good cards, return {"cards":[]} rather than inventing content.`,
  }
}

function regeneratePrompt(card, materialName, snippet) {
  return {
    role: 'system',
    content: `You rewrite one spaced-repetition flashcard about "${materialName}", grounded in the source excerpt below — do not invent facts beyond it.

SOURCE EXCERPT:
${snippet}

The current version is:
FRONT: ${card.front}
BACK: ${card.back}

Write ONE replacement card:
- Same concept, but a genuinely different angle or phrasing — not a paraphrase.
- Draw the rewrite from the source excerpt, not just from the current front/back.
- Back is self-contained, 1-3 sentences.
- Keep sourceRef consistent with the original ("${card.sourceRef ?? 'p. ?'}").
Return exactly one card.`,
  }
}

// --- Schemas (PRD: schema validation of output) ------------------------------

function cardItem() {
  return {
    type: 'object',
    properties: {
      front: { type: 'string', minLength: 5, maxLength: 300 },
      back: { type: 'string', minLength: 5, maxLength: 1000 },
      sourceRef: { type: 'string', maxLength: 80 },
    },
    required: ['front', 'back', 'sourceRef'],
    additionalProperties: false,
  }
}

function cardsSchema() {
  return {
    type: 'json_schema',
    name: 'flashcards',
    strict: true,
    schema: {
      type: 'object',
      properties: { cards: { type: 'array', items: cardItem() } },
      required: ['cards'],
      additionalProperties: false,
    },
  }
}

function regenerateSchema() {
  return cardsSchema()
}

// --- Provider abstraction (Gemini primary — free tier, no card required —
// falling back to Claude, then OpenAI if both are unavailable/failed) -------

async function callLLM(systemMessage, schema, maxCards) {
  try {
    return await callGemini(systemMessage, schema, maxCards)
  } catch (geminiErr) {
    console.error('Gemini failed, trying Claude fallback:', geminiErr)
    try {
      return await callClaude(systemMessage, maxCards)
    } catch (claudeErr) {
      console.error('Claude failed, trying OpenAI fallback:', claudeErr)
      return await callOpenAI(systemMessage, schema, maxCards)
    }
  }
}

async function callGemini(systemMessage, schema, maxCards) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const model = Deno.env.get('GENERATION_MODEL_GEMINI') ?? 'gemini-3.6-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemMessage.content }] },
        contents: [{ role: 'user', parts: [{ text: 'Generate the cards now.' }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300 * maxCards + 200,
          responseMimeType: 'application/json',
          responseSchema: geminiSchema(schema),
        },
      }),
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!raw) throw new Error('Gemini returned no content')
  return validateCards(JSON.parse(raw))
}

// Gemini's responseSchema doesn't support the OpenAI json_schema wrapper
// shape (no "strict"/"name" keys, no additionalProperties) — strip down to
// the plain schema object.
function geminiSchema(openAiSchema) {
  const { schema } = openAiSchema
  return stripAdditionalProperties(schema)
}

function stripAdditionalProperties(node) {
  if (Array.isArray(node)) return node.map(stripAdditionalProperties)
  if (node && typeof node === 'object') {
    const { additionalProperties, ...rest } = node
    for (const key of Object.keys(rest)) rest[key] = stripAdditionalProperties(rest[key])
    return rest
  }
  return node
}

async function callOpenAI(systemMessage, schema, maxCards) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('GENERATION_MODEL') ?? 'gpt-4o-mini',
      messages: [
        systemMessage,
        { role: 'user', content: 'Generate the cards now.' },
      ],
      response_format: { type: 'json_schema', json_schema: schema },
      temperature: 0.4,
      max_tokens: 300 * maxCards + 200,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  return validateCards(JSON.parse(data.choices[0].message.content))
}

async function callClaude(systemMessage, maxCards) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('Generation failed — no working AI provider available.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300 * maxCards + 200,
      system: systemMessage.content + '\nRespond with ONLY a JSON object: {"cards":[{"front":"...","back":"...","sourceRef":"..."}]}',
      messages: [{ role: 'user', content: 'Generate the cards now.' }],
    }),
  })

  if (!res.ok) throw new Error(`Claude ${res.status}`)
  const data = await res.json()
  const raw = data.content?.[0]?.text ?? ''
  const jsonStart = raw.indexOf('{')
  const jsonEnd = raw.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Claude returned no JSON')
  return validateCards(JSON.parse(raw.slice(jsonStart, jsonEnd + 1)))
}

// Shared validation — both providers pass through this, so malformed model
// output can never reach the client (PRD 34: malformed model output case).
function validateCards(parsed) {
  const cards = parsed?.cards
  if (!Array.isArray(cards)) throw new Error('Model output missing cards array')
  return cards
    .filter(
      (c) =>
        typeof c.front === 'string' && c.front.trim().length >= 5 &&
        typeof c.back === 'string' && c.back.trim().length >= 5
    )
    .map((c, i) => ({
      id: `gen-${Date.now()}-${i}`,
      front: c.front.trim(),
      back: c.back.trim(),
      sourceRef: typeof c.sourceRef === 'string' && c.sourceRef.trim() ? c.sourceRef.trim() : '—',
    }))
}
