// Client for the `generate-cards` Edge Function (PRD 20: AI System).
// The Edge Function holds the LLM key and does schema-validated generation;
// this module just marshals requests and normalizes errors for the UI.

import { supabase } from './supabaseClient'

const FUNCTION_NAME = 'generate-cards'

export class GenerationError extends Error {
  constructor(message, { retryable = false } = {}) {
    super(message)
    this.name = 'GenerationError'
    this.retryable = retryable
  }
}

async function invoke(payload) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: payload })

  if (error) {
    // FunctionsHttpError = the function ran and returned a structured JSON
    // error body (any status — 400 bad input, 401 auth, 429 rate-limited,
    // 502 generation failure incl. Gemini errors). Only a missing `.context`
    // means we never got a response at all (network drop, function not
    // deployed, cold-start crash) — that's the one case worth the generic
    // "check your connection" message.
    const status = error.context?.status ?? error.status
    if (error.context) {
      let message = error.message
      try {
        const body = await error.context.json()
        if (body?.error) message = body.error
      } catch {
        // keep the raw message
      }
      throw new GenerationError(message, { retryable: status === 429 || status === 502 })
    }
    throw new GenerationError(
      "Couldn't reach the generation service. Check your connection and try again.",
      { retryable: true }
    )
  }

  // fullyCovered means every chunk of this material has already produced
  // cards in a past pass — an empty array here is expected, not a failure.
  if (!data?.cards?.length && !data?.fullyCovered) {
    throw new GenerationError(
      'The model returned no usable cards. Try regenerating, possibly with more detailed material.',
      { retryable: true }
    )
  }
  return data
}

// mode "generate": full material -> candidate cards.
// Text is pre-chunked by the Edge Function; count caps the merged result.
// Pass materialId to draw only from not-yet-covered chunks of a material
// uploaded earlier ("generate more" without re-uploading). Pass
// storagePath (+ subjectId) instead, with no materialId, on first upload —
// the function persists the material and starts coverage tracking.
export function generateCards({ subjectId, materialName, text, count = 12, materialId, storagePath }) {
  return invoke({ mode: 'generate', subjectId, materialName, text, count, materialId, storagePath })
}

// mode "regenerate": one existing candidate + its source text -> a fresh
// take on the same card. Kept as a separate mode so the prompt can demand a
// different phrasing rather than a near-duplicate.
export function regenerateCard({ subjectId, materialName, text, card }) {
  return invoke({ mode: 'regenerate', subjectId, materialName, text, card })
}