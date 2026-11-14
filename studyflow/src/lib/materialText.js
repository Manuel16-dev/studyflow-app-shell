// Client-side text extraction for AI card generation (PRD 12.4 + 22).
//
// Extraction happens in the browser rather than in an Edge Function: PDF.js
// and mammoth are battle-tested in the browser, it avoids needing a Storage
// bucket + async job infrastructure for the MVP, and the file never leaves
// the user's device — only the extracted *text* is sent to the generation
// Edge Function.
//
// Supported: PDF (text-based), PPTX slides, DOCX, and plain text. Scanned/image PDFs have
// no text layer; we surface that honestly instead of sending garbage to the
// LLM (PRD 22: "show extraction quality").

// pdfjs and mammoth are dynamically imported so they land in a separate
// chunk — users who never generate cards never download ~1MB of parsers.

export const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB
// Generations are chunked server-side; beyond this the material is so large
// the user should split it. Truncating silently would produce cards that
// ignore half their document, so we hard-stop instead (PRD: no silent loss).
export const MAX_EXTRACTED_CHARS = 400_000

// .ppt (the pre 2007 binary format) is accepted by the picker only so we can
// explain how to convert it, instead of the file silently being unselectable.
export const ACCEPTED_TYPES = '.pdf,.pptx,.ppt,.docx,.txt,.md'

export class ExtractionError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ExtractionError'
  }
}

// PDFs (and occasionally DOCX) can yield text containing unpaired UTF-16
// surrogates or stray NUL bytes — usually from broken font/ligature
// encoding. Postgres/PostgREST reject these outright on insert with
// "unsupported Unicode escape sequence", which surfaced as a confusing
// generic failure. Round-tripping through TextEncoder/TextDecoder replaces
// any lone surrogate with U+FFFD (per spec); NUL bytes are stripped
// separately since the round-trip doesn't touch them.
function sanitizeText(text) {
  const clean = new TextDecoder('utf-8').decode(new TextEncoder().encode(text))
  const replacedCount = (clean.match(/\uFFFD/g) ?? []).length
  return { text: clean.replace(/\u0000/g, ''), replacedCount }
}

// Returns { name, size, pages, text, truncated, garbled }
export async function extractText(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractionError(
      `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 20 MB.`
    )
  }

  const lower = file.name.toLowerCase()
  let result
  if (lower.endsWith('.pdf')) {
    result = await extractPdf(file)
  } else if (lower.endsWith('.pptx')) {
    result = await extractPptx(file)
  } else if (lower.endsWith('.ppt')) {
    throw new ExtractionError(
      `"${file.name}" is an old PowerPoint format. In PowerPoint, choose File, Save As and pick PPTX (or PDF), then upload that.`
    )
  } else if (lower.endsWith('.docx')) {
    result = await extractDocx(file)
  } else if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    result = await extractPlainText(file)
  } else {
    throw new ExtractionError('Unsupported file type. Use PDF, PPTX, DOCX, TXT, or MD.')
  }

  const { text: cleanText, replacedCount } = sanitizeText(result.text)
  result.text = cleanText

  if (!result.text || result.text.replace(/\s/g, '').length < 200) {
    throw new ExtractionError(
      result.kind === 'pptx'
        ? `Not enough text found in "${file.name}". Slides that are only pictures can't be read yet. Try a version with text, or export it as a PDF.`
        : result.pages
        ? `No readable text found in "${file.name}". If it's a scanned document, it needs OCR, which isn't supported yet.`
        : `"${file.name}" doesn't contain enough text to generate cards from.`
    )
  }

  let truncated = false
  if (result.text.length > MAX_EXTRACTED_CHARS) {
    result.text = result.text.slice(0, MAX_EXTRACTED_CHARS)
    truncated = true
  }

  // A handful of stray replacements is normal (odd bullet/ligature glyphs);
  // flag it as "garbled" only past a threshold, so the user isn't warned
  // over noise but does find out when the source PDF's encoding is actually
  // broken and card quality may suffer.
  const garbled = replacedCount > 10

  return { name: file.name, size: file.size, pages: result.pages ?? null, text: result.text, truncated, garbled }
}

async function extractPdf(file) {
  const [{ default: workerUrl }, pdfjs] = await Promise.all([
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    import('pdfjs-dist'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  let doc
  try {
    doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  } catch {
    throw new ExtractionError(`"${file.name}" couldn't be opened as a PDF — it may be corrupted.`)
  }

  // Page markers double as citation anchors: the model is told to reference
  // them, so sourceRef on generated cards maps to real page numbers.
  const pageTexts = []
  const numPages = doc.numPages
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim()
    pageTexts.push(`[page ${i}] ${text}`)
  }
  // Cleanup only — the extracted text above is already good, so a failure
  // here (seen with some pdfjs-dist v6 builds where destroy() isn't always
  // present on the returned proxy) must never discard real results.
  try {
    await doc.destroy?.()
  } catch (err) {
    console.warn('pdf doc cleanup failed (non-fatal):', err)
  }
  return { pages: numPages, text: pageTexts.join('\n\n') }
}

// PPTX is a zip of XML files. Slide order comes from presentation.xml (file
// names don't follow reordered slides); speaker notes are included because
// lecturers often put the real explanation there. Slide numbers, dates and
// other fields are skipped. Slides are labeled "[slide N]" like "[page N]"
// for PDFs, so Flow Buddy can cite them.
const DML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'

function slideText(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const lines = []
  for (const p of Array.from(doc.getElementsByTagNameNS(DML_NS, 'p'))) {
    const runs = Array.from(p.getElementsByTagNameNS(DML_NS, 't'))
      .filter((t) => t.parentNode?.localName !== 'fld')
      .map((t) => t.textContent)
    const line = runs.join('').trim()
    if (line) lines.push(line)
  }
  return lines.join('\n')
}

function relTargets(relsXml) {
  const map = new Map()
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = m[0].match(/\bId="([^"]+)"/)?.[1]
    const target = m[0].match(/\bTarget="([^"]+)"/)?.[1]
    if (id && target) map.set(id, target)
  }
  return map
}

async function extractPptx(file) {
  try {
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const read = async (path) => (zip.file(path) ? zip.file(path).async('string') : null)

    const presentation = await read('ppt/presentation.xml')
    const presRels = await read('ppt/_rels/presentation.xml.rels')
    if (!presentation || !presRels) throw new Error('not a presentation')

    const targets = relTargets(presRels)
    const slidePaths = [...presentation.matchAll(/<p:sldId\b[^>]*>/g)]
      .map((m) => targets.get(m[0].match(/\br:id="([^"]+)"/)?.[1]))
      .filter(Boolean)
      .map((t) => 'ppt/' + t.replace(/^\/?(ppt\/)?/, ''))

    const parts = []
    for (const [i, path] of slidePaths.entries()) {
      const xml = await read(path)
      if (!xml) continue
      const body = slideText(xml)

      let notes = ''
      const relPath = path.replace('slides/', 'slides/_rels/') + '.rels'
      const rels = await read(relPath)
      const notesTarget = rels && [...relTargets(rels).values()].find((t) => t.includes('notesSlide'))
      if (notesTarget) {
        const notesXml = await read('ppt/' + notesTarget.replace(/^\.\.\//, ''))
        if (notesXml) notes = slideText(notesXml)
      }

      if (body || notes) parts.push(`[slide ${i + 1}] ${body}${notes ? `\nSpeaker notes: ${notes}` : ''}`)
    }
    return { pages: slidePaths.length, text: parts.join('\n\n'), kind: 'pptx' }
  } catch (err) {
    if (err instanceof ExtractionError) throw err
    throw new ExtractionError(`"${file.name}" couldn't be opened as a PPTX file.`)
  }
}

async function extractDocx(file) {
  try {
    const { default: mammoth } = await import('mammoth/mammoth.browser.js')
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return { pages: null, text: value }
  } catch (err) {
    if (err instanceof ExtractionError) throw err
    throw new ExtractionError(`"${file.name}" couldn't be opened as a DOCX file.`)
  }
}

async function extractPlainText(file) {
  return { pages: null, text: await file.text() }
}