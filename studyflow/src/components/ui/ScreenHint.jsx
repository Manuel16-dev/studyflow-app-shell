import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { HINTS, hintKeyFor, hintIdFor } from '../../lib/hints'
import FlowBuddy from './FlowBuddy'

// First visit hint card, spoken by Flow Buddy. Mounted once in AppShell
// (bottom) and once in the full screen Review flow (top, so it never covers
// the rating buttons). State lives in localStorage: no table, no network call.
// Same colours as the Review rating buttons, so the example matches what
// the student sees below it (the label text carries the meaning, not colour).
const toneClass = {
  danger: 'text-danger-text',
  accent: 'text-accent-text',
  secondary: 'text-secondary-text',
  info: 'text-info-text',
}

const SEEN_KEY = 'sf_seen_hints'
const OFF_KEY = 'sf_hints_off'

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
  } catch {
    return []
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode): the hint just shows again next visit.
  }
}

export default function ScreenHint({ position = 'bottom' }) {
  const { pathname } = useLocation()
  const key = hintKeyFor(pathname)
  const [visibleKey, setVisibleKey] = useState(null)

  useEffect(() => {
    setVisibleKey(null)
    if (!key) return
    let off = false
    try {
      off = localStorage.getItem(OFF_KEY) === '1'
    } catch {
      // treat as not off
    }
    if (off || readSeen().includes(hintIdFor(key))) return
    // Short delay so the card doesn't flash in over the screen's own load.
    const t = setTimeout(() => setVisibleKey(key), 700)
    return () => clearTimeout(t)
  }, [key])

  if (!visibleKey) return null

  function dismiss() {
    safeSet(SEEN_KEY, JSON.stringify([...new Set([...readSeen(), hintIdFor(visibleKey)])]))
    setVisibleKey(null)
  }

  function skipAll() {
    safeSet(OFF_KEY, '1')
    setVisibleKey(null)
  }

  const placement = position === 'top' ? 'top-16' : 'bottom-20 md:bottom-4'
  const hint = HINTS[visibleKey]
  const rich = typeof hint === 'object'

  return (
    <div
      role="status"
      className={`fixed inset-x-3 ${placement} z-40 mx-auto max-w-sm rounded-xl border border-neutral-200 bg-surface p-3 shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <FlowBuddy size={40} />
        <div className="flex-1 min-w-0 max-h-[65vh] overflow-y-auto">
          <p className="text-xs font-medium text-primary-text">Flow Buddy</p>
          <p className="text-sm text-neutral-900 mt-0.5">{rich ? hint.text : hint}</p>
          {rich && hint.example && (
            <div className="mt-2">
              <div className="rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2">
                <p className="text-xs text-neutral-500">Card</p>
                <p className="text-sm font-medium text-neutral-900">{hint.example.question}</p>
                <p className="text-xs text-neutral-500 mt-1.5">Answer</p>
                <p className="text-sm font-medium text-neutral-900">{hint.example.answer}</p>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {hint.example.ratings.map((r) => (
                  <li key={r.label} className="text-sm text-neutral-700">
                    <span className={`font-semibold ${toneClass[r.tone]}`}>{r.label}</span>
                    {' — '}
                    {r.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss tip"
          className="p-1 -m-1 rounded-md text-neutral-500 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center justify-between mt-2 pl-[52px]">
        <button
          type="button"
          onClick={skipAll}
          className="text-xs text-neutral-500 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Skip all tips
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm font-medium text-primary-text hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
