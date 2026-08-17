import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, RotateCcw, TrendingDown, Check, Zap, PartyPopper } from 'lucide-react'
import Button from '../components/ui/Button'
import { mockReviewQueue, ratingIntervals } from '../data/mockReviewQueue'

const ratings = [
  { id: 'again', label: 'Again', Icon: RotateCcw, classes: 'border-danger text-danger bg-danger-light hover:bg-danger hover:text-white' },
  { id: 'hard', label: 'Hard', Icon: TrendingDown, classes: 'border-accent text-accent bg-accent-light hover:bg-accent hover:text-white' },
  { id: 'good', label: 'Good', Icon: Check, classes: 'border-secondary text-secondary bg-secondary-light hover:bg-secondary hover:text-white' },
  { id: 'easy', label: 'Easy', Icon: Zap, classes: 'border-blue-400 text-blue-500 bg-blue-50 hover:bg-blue-500 hover:text-white' },
]

export default function Review() {
  const navigate = useNavigate()
  const [queue] = useState(mockReviewQueue)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const total = queue.length
  const current = queue[index]
  const done = index >= total

  function handleReveal() {
    setRevealed(true) // State A -> State B
  }

  function handleRate() {
    // State C -> scheduler update -> State D.
    // TODO: send rating to the FSRS scheduler/backend instead of just advancing locally.
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Progress + close — full-screen flow, no persistent nav during recall (spec 4.3 / 7) */}
      <header className="flex items-center gap-4 h-14 px-4 border-b border-neutral-200 bg-white sticky top-0">
        <span className="text-xs font-medium text-neutral-500 shrink-0 tabular-nums">
          {Math.min(index + 1, total)} / {total}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(index / total) * 100}%` }}
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
        {done ? (
          <div className="w-full max-w-sm text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary-light text-secondary mx-auto mb-4">
              <PartyPopper className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">Review complete!</h1>
            <p className="text-sm text-neutral-500 mt-1 mb-6">
              Nice work — you got through all {total} cards due today.
            </p>
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
            <div className="bg-white border border-neutral-200 rounded-lg p-8 min-h-[280px] flex flex-col items-center justify-center text-center gap-4">
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
                {ratings.map(({ id, label, Icon, classes }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={handleRate}
                    className={`flex flex-col items-center gap-1 rounded-md border py-3 text-xs font-semibold transition-colors ${classes}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    <span className="text-[10px] font-normal opacity-80">{ratingIntervals[id]}</span>
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
