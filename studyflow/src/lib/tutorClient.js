// Client for the `tutor-chat` Edge Function. The function streams its answer
// as server sent events, so words can appear as the model writes them.
// For local testing of the function itself, set VITE_TUTOR_URL=http://localhost:8000
// in .env.local; leave it unset to use the deployed function.

import { supabase } from './supabaseClient'

export class TutorError extends Error {
  constructor(message, { retryable = false } = {}) {
    super(message)
    this.name = 'TutorError'
    this.retryable = retryable
  }
}

const BUSY = /Gemini \d{3}|UNAVAILABLE|high demand|quota|timeout/i

// messages: [{ role: 'user' | 'assistant', content }]. onDelta(text) is called
// with each piece as it arrives. Resolves with { grounded, sources } when the
// answer is complete.
export async function askTutor({ subjectId, mode, level = 'standard', messages, onDelta }) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const url = import.meta.env.VITE_TUTOR_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-chat`

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        subjectId,
        mode,
        level,
        messages: messages.slice(-10).map(({ role, content }) => ({ role, content })),
      }),
    })
  } catch {
    throw new TutorError("Couldn't reach the tutor. Check your connection and try again.", { retryable: true })
  }

  if (!res.ok) {
    let message = 'The tutor failed. Try again.'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // keep the default
    }
    if (BUSY.test(message)) message = 'The AI service is busy right now. Wait a minute and try again.'
    throw new TutorError(message, { retryable: res.status === 429 || res.status === 502 })
  }
  if (!res.body) throw new TutorError('The tutor returned nothing. Try again.', { retryable: true })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let result = null

  while (true) {
    let chunk
    try {
      chunk = await reader.read()
    } catch {
      throw new TutorError('The connection dropped. Try again.', { retryable: true })
    }
    if (chunk.done) break
    buf += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n')
    let end
    while ((end = buf.indexOf('\n\n')) !== -1) {
      const raw = buf.slice(0, end)
      buf = buf.slice(end + 2)
      const data = raw
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('')
      if (!data) continue
      let ev
      try {
        ev = JSON.parse(data)
      } catch {
        continue
      }
      if (ev.type === 'delta') onDelta?.(ev.text)
      else if (ev.type === 'done') result = { grounded: ev.grounded, sources: ev.sources ?? [] }
      else if (ev.type === 'error') throw new TutorError(ev.message || 'The tutor stopped partway.', { retryable: true })
    }
  }

  if (!result) throw new TutorError('The tutor stopped before finishing. Try again.', { retryable: true })
  return result
}
