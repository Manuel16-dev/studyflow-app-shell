import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Send, RotateCcw } from 'lucide-react'
import Button from '../components/ui/Button'
import FlowBuddy from '../components/ui/FlowBuddy'
import { getSubjects } from '../lib/subjectsStore'
import { getMaterialsWithCoverage } from '../lib/materialsStore'
import { askTutor } from '../lib/tutorClient'
import { getTutorHistory, saveTutorExchange, clearTutorHistory } from '../lib/tutorHistoryStore'

const MODES = [
  { key: 'explain', label: 'Explain', hint: 'Clear step by step explanations' },
  { key: 'example', label: 'Example', hint: 'A worked example of the idea' },
  { key: 'socratic', label: 'Socratic', hint: 'Guides you with questions, no direct answers' },
  { key: 'quiz', label: 'Quiz me', hint: 'Asks you questions one at a time' },
]

// Where the message box sits. Change this one word to switch:
//   'pinned'  fixed to the bottom of the screen, like a chat app
//   'sticky'  under the conversation, then sticks to the bottom as it grows
//   'inline'  always directly under the last message, scrolls with the page
const COMPOSER_POSITION = 'pinned'

const COMPOSER = {
  pinned: {
    page: 'pb-28',
    // md:left-[312px] clears the desktop sidebar; adjust if it overlaps or leaves a gap
    form: 'fixed bottom-16 md:bottom-0 inset-x-0 md:left-[312px] z-30 bg-neutral-50/95 backdrop-blur border-t border-neutral-200 px-4 py-3',
    inner: 'max-w-3xl mx-auto',
  },
  sticky: {
    page: 'pb-6',
    form: 'sticky bottom-16 md:bottom-0 z-30 bg-neutral-50/95 backdrop-blur border-t border-neutral-200 py-3',
    inner: '',
  },
  inline: {
    page: 'pb-6',
    form: 'border-t border-neutral-200 py-3',
    inner: '',
  },
}[COMPOSER_POSITION]

// Greetings are plain text (free and instant, no AI call). One is picked each
// time the page opens.
const GREETINGS = [
  (s) => `Hey! Ready to work on ${s}? Ask me anything, or let me quiz you.`,
  (s) => `Good to see you. What part of ${s} is giving you trouble?`,
  (s) => `I'm all ears. Ask about ${s} and I'll answer from your notes.`,
  (s) => `Let's make ${s} stick. Ask a question or tap Quiz me.`,
  (s) => `Welcome back! Want to go over something in ${s}?`,
]

const STARTERS = [
  { key: 'quiz', label: 'Quiz me' },
  { key: 'explain', label: 'Explain a topic' },
  { key: 'example', label: 'Show me an example' },
]

// Shown after each tutor reply (UI spec: suggested follow ups).
const FOLLOW_UPS = [
  { label: 'Give an example', text: 'Give me an example of that.', mode: 'example' },
  { label: 'Explain it simpler', text: 'Explain that more simply.', mode: 'explain' },
  { label: 'Quiz me on this', text: 'Quiz me on this.', mode: 'quiz' },
]

export default function Tutor() {
  const [params] = useSearchParams()
  const [subjects, setSubjects] = useState(null) // null = loading
  const [subjectId, setSubjectId] = useState(params.get('subject') ?? '')
  const [materialCount, setMaterialCount] = useState(null)
  const [mode, setMode] = useState('explain')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const textareaRef = useRef(null)
  const [greetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length))

  useEffect(() => {
    getSubjects()
      .then((list) => {
        setSubjects(list)
        setSubjectId((cur) => (list.some((s) => s.id === cur) ? cur : (list[0]?.id ?? '')))
      })
      .catch(() => setSubjects([]))
  }, [])

  useEffect(() => {
    setMessages([])
    setError('')
    setMaterialCount(null)
    setHistoryReady(false)
    if (!subjectId) return
    let cancelled = false
    // Each subject keeps its own saved thread; load it when the subject opens.
    getTutorHistory(subjectId)
      .then((h) => {
        if (cancelled) return
        setMessages(h)
        setHistoryReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setHistoryReady(true) // start fresh rather than block the chat
      })
    getMaterialsWithCoverage(subjectId)
      .then((m) => !cancelled && setMaterialCount(m.length))
      .catch(() => !cancelled && setMaterialCount(null))
    return () => {
      cancelled = true
    }
  }, [subjectId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const subject = subjects?.find((s) => s.id === subjectId)

  async function send(text, useMode = mode) {
    const content = text.trim()
    if (!content || loading || !subjectId || !historyReady) return
    const next = [...messages, { role: 'user', content }]
    // Empty tutor bubble that fills in as words stream in.
    setMessages([...next, { role: 'assistant', content: '' }])
    setInput('')
    setError('')
    setLoading(true)
    let received = false
    let answer = ''
    try {
      const data = await askTutor({
        subjectId,
        mode: useMode,
        messages: next,
        onDelta: (piece) => {
          const first = !received
          received = true
          answer += first ? piece.trimStart() : piece
          setMessages((prev) => {
            const copy = prev.slice()
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + (first ? piece.trimStart() : piece) }
            return copy
          })
        },
      })
      setMessages((prev) => {
        const copy = prev.slice()
        copy[copy.length - 1] = { ...copy[copy.length - 1], grounded: data.grounded }
        return copy
      })
      saveTutorExchange(subjectId, content, answer, data.grounded).catch(() =>
        setError("That exchange couldn't be saved to your history.")
      )
    } catch (err) {
      setError(err.message || 'The tutor failed. Try again.')
      if (!received) {
        setMessages(messages) // nothing arrived: roll back the unanswered question
        setInput(content)
      }
    } finally {
      setLoading(false)
    }
  }

  async function newChat() {
    try {
      await clearTutorHistory(subjectId)
      setMessages([])
      setError('')
    } catch {
      setError("Couldn't clear this chat. Try again.")
    }
  }

  function pickMode(key) {
    setMode(key)
    // Quiz and Socratic make sense as an opening move, so start them for the student.
    if (key === 'quiz' && messages.length === 0 && subject) send(`Quiz me on ${subject.name}.`, key)
  }

  function startWith(key) {
    if (key === 'quiz') {
      pickMode('quiz')
    } else {
      setMode(key)
      textareaRef.current?.focus()
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  if (subjects && subjects.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Flow Buddy</h1>
        <p className="text-sm text-neutral-500 mt-2">
          Create a subject and add your notes first, then the tutor can answer from them.{' '}
          <Link to="/subjects" className="text-primary-text underline">
            Go to Subjects
          </Link>
        </p>
      </div>
    )
  }

  const lastIsTutor = messages.length > 0 && messages[messages.length - 1].role === 'assistant'

  return (
    <div className={`p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-4 ${COMPOSER.page}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Flow Buddy</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Your AI study guide. Ask about your own notes and answers cite where they came from.</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" className="px-2 py-1.5 text-sm shrink-0" onClick={newChat}>
            <RotateCcw className="w-4 h-4 inline mr-1" aria-hidden="true" />
            New chat
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          Subject
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={loading}
            className="rounded-md border border-neutral-300 bg-surface px-3 py-2 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
          >
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div role="group" aria-label="Tutor mode" className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              title={m.hint}
              aria-pressed={mode === m.key}
              onClick={() => pickMode(m.key)}
              disabled={loading}
              className={[
                'rounded-full px-3 py-1.5 text-sm font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50',
                mode === m.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-neutral-700 border-neutral-300 hover:bg-neutral-50',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 -mt-1">{MODES.find((m) => m.key === mode).hint}</p>

        {materialCount === 0 && (
          <p className="text-xs text-neutral-700 bg-primary-light rounded-md px-3 py-2.5">
            This subject has no uploaded material yet, so answers will be general knowledge, not from your notes.{' '}
            <Link to={`/subjects/${subjectId}/generate`} className="text-primary-text underline">
              Add notes
            </Link>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3" aria-live="polite">
        {messages.length === 0 && !loading && historyReady && (
          <div className="flex items-start gap-3 py-2">
            <FlowBuddy size={48} />
            <div className="flex-1">
              <div className="rounded-2xl rounded-tl-sm bg-surface border border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                <span className="block text-xs font-medium text-primary-text mb-0.5">Flow Buddy</span>
                {GREETINGS[greetingIdx](subject?.name ?? 'your subject')}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {STARTERS.map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => startWith(st.key)}
                    className="rounded-full px-3 py-1.5 text-sm text-primary-text border border-primary/30 hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          m.role === 'assistant' && !m.content ? null : (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start gap-2'}>
            {m.role === 'assistant' && <FlowBuddy size={28} className="mt-1" />}
            <div
              className={[
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                m.role === 'user' ? 'bg-primary text-white' : 'bg-surface border border-neutral-200 text-neutral-900',
              ].join(' ')}
            >
              {m.content}
              {m.role === 'assistant' && m.grounded === false && (
                <span className="block text-xs text-neutral-500 mt-2">No matching passage found in your notes.</span>
              )}
            </div>
          </div>
          )
        ))}

        {loading && !messages[messages.length - 1]?.content && <p className="text-sm text-neutral-500 animate-pulse">Thinking…</p>}

        {lastIsTutor && !loading && (
          <div className="flex flex-wrap gap-2">
            {FOLLOW_UPS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  setMode(f.mode)
                  send(f.text, f.mode)
                }}
                className="rounded-full px-3 py-1 text-xs text-primary-text border border-primary/30 hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-primary"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger bg-danger-light border border-danger/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className={COMPOSER.form}
      >
        <div className={`flex items-end gap-2 ${COMPOSER.inner}`}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            ref={textareaRef}                 
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={2000}
            placeholder="Ask about your notes"
            aria-label="Message the tutor"
            disabled={loading || !subjectId}
            className="flex-1 resize-none rounded-lg border border-neutral-300 bg-surface px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
          />
          <Button type="submit" variant="primary" className="px-3 py-2.5" disabled={loading || !input.trim()} aria-label="Send">
            <Send className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  )
}
