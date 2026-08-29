// Client-side text extraction for AI card generation (PRD 12.4 + 22).
//
// Extraction happens in the browser rather than in an Edge Function: PDF.js
// and mammoth are battle-tested in the browser, it avoids needing a Storage
// bucket + async job infrastructure for the MVP, and the file never leaves
// the user's device — only the extracted *text* is sent to the generation
// Edge Function.
//
// Supported: PDF (text-based), DOCX, and plain text. Scanned/image PDFs have
// no text layer; we surface that honestly instead of sending garbage to the
// LLM (PRD 22: "show extraction quality").

// pdfjs and mammoth are dynamically imported so they land in a separate
// chunk — users who never generate cards never download ~1MB of parsers.

export const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB
// Generations are chunked server-side; beyond this the material is so large
// the user should split it. Truncating silently would produce cards that
// ignore half their document, so we hard-stop instead (PRD: no silent loss).
export const MAX_EXTRACTED_CHARS = 400_000

export const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md'

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
  } else if (lower.endsWith('.docx')) {
    result = await extractDocx(file)
  } else if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    result = await extractPlainText(file)
  } else {
    throw new ExtractionError('Unsupported file type. Use PDF, DOCX, TXT, or MD.')
  }

  const { text: cleanText, replacedCount } = sanitizeText(result.text)
  result.text = cleanText

  if (!result.text || result.text.replace(/\s/g, '').length < 200) {
    throw new ExtractionError(
      result.pages
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