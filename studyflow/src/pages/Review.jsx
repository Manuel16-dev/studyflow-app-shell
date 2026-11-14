import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, RotateCcw, TrendingDown, Check, Zap, PartyPopper } from 'lucide-react'
import Button from '../components/ui/Button'
import { Rating, State, schedule } from '../lib/fsrs'
import { getCardState, saveCardState, logReview } from '../lib/reviewStore'
import { getDueSession, getPracticeQueue, PRACTICE_SOURCES } from '../lib/reviewQueue'
import { getSettings } from '../lib/settingsStore'
import { logStudySession } from '../lib/studySessionsStore'
import { todayKey } from '../lib/dates'
import ScreenHint from '../components/ui/ScreenHint'
import { useLevelUp } from '../components/gamification/useLevelUp'
import { getXpSummary } from '../lib/xpStore'

// Card animation. The flip is pure CSS (see .sf-flip in index.css). On rating,
// the card is pulled down into the button that was pressed; SUCK_TARGET aims
// it at that button's column (4 equal buttons under the card) with a slight
// twist, and VACUUM_MS matches the sf-vacuum duration in index.css.
const VACUUM_MS = 380
const SUCK_TARGET = {
  again: { x: '-37%', rot: '-16deg' },
  hard: { x: '-12%', rot: '-6deg' },
  good: { x: '12%', rot: '6deg' },
  easy: { x: '37%', rot: '16deg' },
}
const FACE =
  'bg-surface border border-neutral-200 rounded-lg p-8 min-h-[280px] flex flex-col items-center justify-center text-center gap-4'

// True when motion should be skipped: OS setting, or Settings > Appearance >
// Reduce motion (which puts a class on <html>).
function prefersReducedMotion() {
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('reduce-motion')
  )
}

// Reviews save to the database one card at a time, so leaving mid-session
// never loses a rating and reopening Review continues with what's left. This
// small local record just keeps the *progress* (cards done today, rating
// counts) so the bar and the summary carry on instead of restarting at 0.
const PROGRESS_KEY = 'studyflow-review-progress'
function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY))
    return saved && saved.day === todayKey() ? saved : null
  } catch {
    return null
  }
}
function writeProgress(value) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(value))
  } catch {
    // storage unavailable: progress simply restarts next time
  }
}
function clearProgress() {
  try {
    localStorage.removeItem(PROGRESS_KEY)
  } catch {
    // ignore
  }
}

const ratings = [
  { id: 'again', rating: Rating.Again, label: 'Again', Icon: RotateCcw, classes: 'border-danger text-danger-text bg-danger-light hover:bg-danger hover:text-white' },
  { id: 'hard', rating: Rating.Hard, label: 'Hard', Icon: TrendingDown, classes: 'border-accent text-accent-text bg-accent-light hover:bg-accent hover:text-white' },
  { id: 'good', rating: Rating.Good, label: 'Good', Icon: Check, classes: 'border-secondary text-secondary-text bg-secondary-light hover:bg-secondary hover:text-white' },
  { id: 'easy', rating: Rating.Easy, label: 'Easy', Icon: Zap, classes: 'border-info text-info-text bg-info-light hover:bg-info hover:text-white' },
]

export default function Review() {
  const navigate = useNavigate()
  // /review?mode=practice&source=weak|practice|exam&subject=<id>&n=10 runs a
  // practice drill instead of the due queue. Practice never changes a card's
  // schedule or the review log; it only counts as study time.
  const [params] = useSearchParams()
  const isPractice = params.get('mode') === 'practice'
  const practiceSource = PRACTICE_SOURCES.includes(params.get('source')) ? params.get('source') : 'weak'
  const practiceSubject = params.get('subject') || null
  const practiceLimit = Math.min(Math.max(Number(params.get('n')) || 10, 1), 50)
  const exitPath = isPractice ? '/practice' : '/'

  const [queue, setQueue] = useState(null) // null = still loading
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [currentState, setCurrentState] = useState(null)
  const [saving, setSaving] = useState(false)
  const [requestRetention, setRequestRetention] = useState(0.9) // default until settings load
  const [baseDone, setBaseDone] = useState(0) // cards already finished earlier today
  const [heldBack, setHeldBack] = useState(0) // due cards left out by daily limits
  const [requeued, setRequeued] = useState(0) // cards shown again this session because they're still being learned
  const [leaving, setLeaving] = useState(null) // rating id while the card is being "sucked away"

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
    if (isPractice) {
      getPracticeQueue({ source: practiceSource, subjectId: practiceSubject, limit: practiceLimit })
        .then(setQueue)
        .catch(() => setQueue([]))
    } else {
      getDueSession()
        .then(({ queue: due, heldBack: held }) => {
          const saved = due.length > 0 ? readProgress() : null
          if (saved) {
            setBaseDone(saved.done)
            setSessionStats(saved.stats)
          } else {
            clearProgress()
          }
          setHeldBack(held)
          setQueue(due)
        })
        .catch(() => setQueue([]))
    }
    getSettings().then((s) => {
      if (s?.studyBehavior?.desiredRetention) setRequestRetention(s.studyBehavior.desiredRetention)
    })
  }, [])

  const total = queue?.length ?? 0
  const current = queue?.[index]
  const done = queue !== null && index >= total

  // Celebrate a new level once the session is finished (never mid-review, so
  // recall isn't interrupted). Each rating is already saved, so the XP read
  // here includes this session's reviews.
  const [levelUpModal, checkForLevelUp] = useLevelUp()
  useEffect(() => {
    if (!done || isPractice || total === 0) return
    getXpSummary()
      .then((summary) => checkForLevelUp(summary.totalXp))
      .catch(() => {})
  }, [done, isPractice, total, checkForLevelUp])

  useEffect(() => {
    if (!current || isPractice) return
    getCardState(current.id).then(setCurrentState)
  }, [current, isPractice])

  function handleReveal() {
    setRevealed(true) // State A -> State B
  }

  async function handleRate(rating, ratingId) {
    // State C -> FSRS scheduler update -> State D. Skipped for practice:
    // drills don't move a card's schedule or add to the review log.
    let stillLearning = false
    if (!isPractice) {
      const { state: nextState } = schedule(currentState, rating, Date.now(), requestRetention)
      setSaving(true)
      await Promise.all([saveCardState(current.id, nextState), logReview(current.id, rating, nextState)])
      setSaving(false)
      stillLearning = nextState.state !== State.Review
    }
    // Pull the card into the button that was pressed, then move on. The wait
    // is skipped when the user (or their OS) has asked for reduced motion.
    setLeaving(ratingId)
    if (!prefersReducedMotion()) await new Promise((resolve) => setTimeout(resolve, VACUUM_MS))
    // A card still in a learning step comes back later in this same session
    // (after the rest of the queue). Copied so it counts as a new queue entry.
    if (stillLearning) {
      setQueue((q) => [...q, { ...current }])
      setRequeued((n) => n + 1)
    }
    ratedCountRef.current += 1
    const nextStats = { ...sessionStats, [ratingId]: sessionStats[ratingId] + 1 }
    setSessionStats(nextStats)
    if (!isPractice) {
      if (index + 1 >= total) clearProgress()
      else writeProgress({ day: todayKey(), done: baseDone + index + 1, stats: nextStats })
    }
    setRevealed(false)
    setCurrentState(null)
    setLeaving(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <ScreenHint position="top" />
      {levelUpModal}
      {/* Progress + close — full-screen flow, no persistent nav during recall (spec 4.3 / 7) */}
      <header className="flex items-center gap-4 h-14 px-4 border-b border-neutral-200 bg-surface sticky top-0">
        <span className="text-xs font-medium text-neutral-500 shrink-0 tabular-nums">
          {isPractice && <span className="text-primary-text mr-2">Practice</span>}
          {Math.min(baseDone + index + 1, baseDone + total)} / {baseDone + total}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${total ? ((baseDone + index) / (baseDone + total)) * 100 : 100}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => navigate(exitPath)}
          className="p-2 -mr-2 rounded-md text-neutral-500 hover:bg-neutral-100 shrink-0"
          aria-label={isPractice ? 'Close practice' : 'Pause review (your progress is saved)'}
          title={isPractice ? 'Close' : 'Pause. Your progress is saved.'}
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {queue === null ? (
          <p className="text-sm text-neutral-400">{isPractice ? 'Loading your practice set…' : 'Loading your review queue…'}</p>
        ) : done ? (
          <div className="w-full max-w-sm text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary-light text-secondary-text mx-auto mb-4">
              <PartyPopper className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">
              {total ? (isPractice ? 'Practice complete!' : 'Review complete!') : isPractice ? 'No cards to practise' : heldBack > 0 ? 'Daily limit reached' : 'Nothing due right now'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">
              {total
                ? isPractice
                  ? `You worked through ${total} cards. Practice doesn't change your review schedule.`
                  : `Nice work — you got through all ${baseDone + total - requeued} cards due today.`
                : isPractice
                  ? 'There are no cards for this set yet.'
                  : heldBack > 0
                    ? 'You have done everything planned for today.'
                    : 'No cards are due yet. Add cards to a subject or check back later.'}
            </p>
            <div className="flex justify-center gap-4 text-xs text-neutral-500 mb-6">
              <span>{sessionStats.again} again</span>
              <span>{sessionStats.hard} hard</span>
              <span>{sessionStats.good} good</span>
              <span>{sessionStats.easy} easy</span>
            </div>
            {!isPractice && heldBack > 0 && (
              <p className="text-xs text-neutral-500 -mt-3 mb-5">
                {total > 0 ? 'Daily limit reached. ' : ''}
                {heldBack} more card{heldBack === 1 ? ' is' : 's are'} waiting for tomorrow.{' '}
                <button type="button" onClick={() => navigate('/settings')} className="underline text-primary-text">
                  Adjust limits
                </button>
              </p>
            )}
            <Button variant="primary" className="w-full" onClick={() => navigate(exitPath)}>
              {isPractice ? 'Back to Practice' : 'Back to Dashboard'}
            </Button>
            <Button variant="secondary" className="w-full mt-2" onClick={() => navigate('/subjects')}>
              Browse Subjects
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-md">
            {/* Keyed by queue position so every new card plays its entrance. */}
            <div key={index} className="sf-enter">
              <p className="text-xs font-medium text-primary-text text-center mb-2">{current.subject}</p>
              <div
                className={`sf-vacuum ${leaving ? 'is-leaving' : ''}`}
                style={leaving ? { '--sx': SUCK_TARGET[leaving].x, '--rot': SUCK_TARGET[leaving].rot } : undefined}
              >
                <div className="sf-scene">
                  <div className={`sf-flip ${revealed ? 'is-flipped' : ''}`}>
                    {/* The face turned away is inert so keyboard and screen readers skip it. */}
                    <div
                      className={`${FACE} sf-face`}
                      inert={revealed}
                      aria-hidden={revealed}
                    >
                      <h1 className="text-lg md:text-xl font-semibold text-neutral-900">{current.question}</h1>
                      <p className="text-sm text-neutral-400">Think about the answer</p>
                      <Button variant="primary" onClick={handleReveal} className="mt-2">
                        Show Answer
                      </Button>
                    </div>
                    <div
                      className={`${FACE} sf-face sf-face-back border-primary/40`}
                      inert={!revealed}
                      aria-hidden={!revealed}
                    >
                      <p className="text-xs text-neutral-400 line-clamp-3">{current.question}</p>
                      <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Answer</p>
                      <p className="text-lg md:text-xl font-semibold text-neutral-900">{current.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {revealed && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {ratings.map(({ id, rating, label, Icon, classes }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleRate(rating, id)}
                    disabled={(!isPractice && !currentState) || saving || leaving !== null}
                    className={`flex flex-col items-center gap-1 rounded-md border py-3 text-xs font-semibold transition-colors disabled:opacity-50 ${classes}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
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
