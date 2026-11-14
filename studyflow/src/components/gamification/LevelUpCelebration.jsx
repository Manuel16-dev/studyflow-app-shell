import { useEffect, useMemo, useRef } from 'react'
import Button from '../ui/Button'
import FlowBuddy from '../ui/FlowBuddy'

// Full-screen "you levelled up" moment: a dimmed backdrop, Flow Buddy, a badge
// that pops in with a ring pulse and a burst of confetti, and how far away the
// next level is. All motion is CSS (see .sf-* in index.css), so it is switched
// off by the same reduced-motion rules as the rest of the app.
//
// Screens don't render this directly: use the useLevelUp() hook (next file),
// which decides when to show it.

const CONFETTI_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-violet)',
]

// Fixed seed, so the burst looks the same every time and rendering stays
// predictable.
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makePieces(count = 34) {
  const rand = seededRandom(20261110)
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.5
    const distance = 90 + rand() * 100
    const round = rand() > 0.6
    return {
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
      spin: `${Math.round((rand() - 0.5) * 900)}deg`,
      delay: `${Math.round(rand() * 160)}ms`,
      width: round ? 8 : 6 + Math.round(rand() * 4),
      height: round ? 8 : 10 + Math.round(rand() * 6),
      round,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }
  })
}

export default function LevelUpCelebration({ from, to, info, onClose }) {
  const buttonRef = useRef(null)
  const pieces = useMemo(() => makePieces(), [])
  const jumped = to - from > 1

  useEffect(() => {
    const previouslyFocused = document.activeElement
    buttonRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="sf-fade absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
        className="sf-dialog-pop relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-surface px-6 pt-6 pb-6 text-center shadow-xl"
      >
        <FlowBuddy size={52} className="sf-bob mx-auto" />

        <div className="relative mx-auto mt-3 flex h-32 w-32 items-center justify-center">
          <span className="sf-ring" aria-hidden="true" />
          <div className="sf-burst-layer pointer-events-none absolute inset-0" aria-hidden="true">
            {pieces.map((p, i) => (
              <span
                key={i}
                className="sf-piece"
                style={{
                  '--dx': `${p.dx}px`,
                  '--dy': `${p.dy}px`,
                  '--spin': p.spin,
                  '--delay': p.delay,
                  width: p.width,
                  height: p.height,
                  background: p.color,
                  borderRadius: p.round ? '9999px' : '2px',
                }}
              />
            ))}
          </div>
          <div className="sf-badge-pop relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">Level</span>
            <span className="text-5xl font-bold leading-none tabular-nums">{to}</span>
          </div>
        </div>

        <h2 id="levelup-title" className="mt-5 text-xl font-semibold text-neutral-900">
          Level {to} reached!
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {jumped ? `You went from level ${from} to level ${to}. ` : ''}All those reviews are adding up.
        </p>

        {info && (
          <div className="mt-4">
            <div
              className="h-2 overflow-hidden rounded-full bg-neutral-100"
              role="progressbar"
              aria-label={`Progress to level ${to + 1}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={info.percent}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${info.percent}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-neutral-500 tabular-nums">
              {info.toNext.toLocaleString()} XP to level {to + 1}
            </p>
          </div>
        )}

        <Button ref={buttonRef} variant="primary" className="mt-5 w-full" onClick={onClose}>
          Keep going
        </Button>
      </div>
    </div>
  )
}
