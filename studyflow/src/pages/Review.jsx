import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, RotateCcw, TrendingDown, Check, Zap, PartyPopper } from 'lucide-react'
import Button from '../components/ui/Button'
import { Rating, schedule, previewIntervals, formatDue } from '../lib/fsrs'
import { getCardState, saveCardState, logReview } from '../lib/reviewStore'
import { getDueQueue } from '../lib/reviewQueue'
import { getSettings } from '../lib/settingsStore'
import { logStudySession } from '../lib/studySessionsStore'

const ratings = [
  { id: 'again', rating: Rating.Again, label: 'Again', Icon: RotateCcw, classes: 'border-danger text-danger bg-danger-light hover:bg-danger hover:text-white' },
  { id: 'hard', rating: Rating.Hard, label: 'Hard', Icon: TrendingDown, classes: 'border-accent text-accent bg-accent-light hover:bg-accent hover:text-white' },
  { id: 'good', rating: Rating.Good, label: 'Good', Icon: Check, classes: 'border-secondary text-secondary bg-secondary-light hover:bg-secondary hover:text-white' },
  { id: 'easy', rating: Rating.Easy, label: 'Easy', Icon: Zap, classes: 'border-info text-info bg-info-light hover:bg-info hover:text-white' },
]

export default function Review() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState(null) // null = still loading
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [currentState, setCurrentState] = useState(null)
  const [saving, setSaving] = useState(false)
  const [requestRetention, setRequestRetention] = useState(0.9) // default until settings load

  // Wall-clock session tracking for the Dashboard's Study Time/Streak —
  // logged on unmount (covers both a normal finish and closing early via
  // the X button) and only if at least one card was actually rated, so
  // opening Review and immediately leaving doesn't count as "studying".
  const sessionStartRef = useRef(Date.now())
  const ratedCountRef = useRef(0)
  useEffect(() => {
    return () => {
      if (ratedCountRef.current > 0) {
        logStudySession(sessionStartRef.current, (Date.now() - sessionStartRef.current) / 1000)
      }
    }
  }, [])

  useEffect(() => {
    getDueQueue().then(setQueue)
    getSettings().then((s) => {
      if (s?.studyBehavior?.desiredRetention) setRequestRetention(s.studyBehavior.desiredRetention)
    })
  }, [])

  const total = queue?.length ?? 0
  const current = queue?.[index]
  const done = queue !== null && index >= total

  useEffect(() => {
    if (!current) return
    getCardState(current.id).then(setCurrentState)
  }, [current])

  // Predicted next-review time per rating, computed live from this card's
  // actual FSRS state — replaces the old hardcoded ratingIntervals mock.
  const preview = useMemo(
    () => (currentState ? previewIntervals(currentState, Date.now(), requestRetention) : null),
    [currentState, requestRetention]
  )

  function handleReveal() {
    setRevealed(true) // State A -> State B
  }

  async function handleRate(rating, ratingId) {
    // State C -> FSRS scheduler update -> State D.
    const { state: nextState } = schedule(currentState, rating, Date.now(), requestRetention)
    setSaving(true)
    await Promise.all([saveCardState(current.id, nextState), logReview(current.id, rating, nextState)])
    setSaving(false)
    ratedCountRef.current += 1
    setSessionStats((s) => ({ ...s, [ratingId]: s[ratingId] + 1 }))
    setRevealed(false)
    setCurrentState(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Progress + close — full-screen flow, no persistent nav during recall (spec 4.3 / 7) */}
      <header className="flex items-center gap-4 h-14 px-4 border-b border-neutral-200 bg-surface sticky top-0">
        <span className="text-xs font-medium text-neutral-500 shrink-0 tabular-nums">
          {Math.min(index + 1, total)} / {total}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${total ? (index / total) * 100 : 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 -mr-2 rounded-md text-neutral-500 hover:bg-neutral-100 shrink-0"
          aria-label="Close review"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {queue === null ? (
          <p className="text-sm text-neutral-400">Loading your review queue…</p>
        ) : done ? (
          <div className="w-full max-w-sm text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary-light text-secondary mx-auto mb-4">
              <PartyPopper className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">
              {total ? 'Review complete!' : 'Nothing due right now'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">
              {total
                ? `Nice work — you got through all ${total} cards due today.`
                : 'No cards are due yet. Add cards to a subject or check back later.'}
            </p>
            <div className="flex justify-center gap-4 text-xs text-neutral-500 mb-6">
              <span>{sessionStats.again} again</span>
              <span>{sessionStats.hard} hard</span>
              <span>{sessionStats.good} good</span>
              <span>{sessionStats.easy} easy</span>
            </div>
            <Button variant="primary" className="w-full" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
            <Button variant="secondary" className="w-full mt-2" onClick={() => navigate('/subjects')}>
              Browse Subjects
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <p className="text-xs font-medium text-primary text-center mb-2">{current.subject}</p>
            <div className="bg-surface border border-neutral-200 rounded-lg p-8 min-h-[280px] flex flex-col items-center justify-center text-center gap-4">
              <h1 className="text-lg md:text-xl font-semibold text-neutral-900">{current.question}</h1>

              {!revealed ? (
                <>
                  <p className="text-sm text-neutral-400">Think about the answer</p>
                  <Button variant="primary" onClick={handleReveal} className="mt-2">
                    Show Answer
                  </Button>
                </>
              ) : (
                <p className="text-sm text-neutral-700 border-t border-neutral-100 pt-4 mt-1">{current.answer}</p>
              )}
            </div>

            {revealed && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {ratings.map(({ id, rating, label, Icon, classes }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleRate(rating, id)}
                    disabled={!preview || saving}
                    className={`flex flex-col items-center gap-1 rounded-md border py-3 text-xs font-semibold transition-colors disabled:opacity-50 ${classes}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    <span className="text-[10px] font-normal opacity-80">
                      {preview ? formatDue(preview[id]) : '…'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
