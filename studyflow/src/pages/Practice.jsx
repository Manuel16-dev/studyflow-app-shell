import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingDown, HelpCircle, GraduationCap, Info } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { getSubjects } from '../lib/subjectsStore'
import { getPracticeCounts } from '../lib/reviewQueue'

const SOURCES = [
  {
    key: 'weak',
    title: 'Weakest cards',
    description: 'Cards you have reviewed that you are most likely to have forgotten right now.',
    empty: 'Review some cards first, then your weakest will show up here.',
    Icon: TrendingDown,
  },
  {
    key: 'practice',
    title: 'Practice questions',
    description: 'Exam-style questions with worked answers, generated from your materials.',
    empty: 'Generate practice questions from a material to fill this set.',
    Icon: HelpCircle,
  },
  {
    key: 'exam',
    title: 'Exam prep',
    description: 'Cards from subjects with an exam in the next 30 days, weakest first.',
    empty: 'Add an exam within the next 30 days to unlock this set.',
    Icon: GraduationCap,
  },
]
const SIZES = [10, 20, 30]

export default function Practice() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [size, setSize] = useState(10)
  const [counts, setCounts] = useState(null) // null = loading
  const [error, setError] = useState('')

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setCounts(null)
    setError('')
    getPracticeCounts(subjectId || null)
      .then((c) => !cancelled && setCounts(c))
      .catch(() => {
        if (cancelled) return
        setError("Couldn't load your practice sets. Please try again.")
        setCounts({ weak: 0, practice: 0, exam: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [subjectId])

  function start(source) {
    const q = new URLSearchParams({ mode: 'practice', source, n: String(size) })
    if (subjectId) q.set('subject', subjectId)
    navigate(`/review?${q.toString()}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-4 pb-16">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Practice</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Focused drills outside your scheduled reviews.</p>
      </div>

      <div className="flex items-start gap-2 text-xs text-neutral-700 bg-primary-light rounded-md px-3 py-2.5">
        <Info className="w-4 h-4 text-primary-text shrink-0 mt-px" aria-hidden="true" />
        <p>
          Practice doesn't change when your cards are next due, so drilling early won't skew your schedule or
          retention stats. It still counts as study time.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger bg-danger-light border border-danger/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          Subject
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="rounded-md border border-neutral-300 bg-surface px-3 py-2 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2" role="group" aria-label="Cards per session">
          <span className="text-sm text-neutral-700">Cards</span>
          {SIZES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSize(n)}
              aria-pressed={size === n}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-primary',
                size === n
                  ? 'border-primary bg-primary-light text-primary-text'
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {SOURCES.map(({ key, title, description, empty, Icon }) => {
          const available = counts?.[key] ?? 0
          const loading = counts === null
          return (
            <Card key={key}>
              <div className="flex items-start gap-3">
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-md bg-primary-light text-primary-text shrink-0"
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
                    <span className="text-xs text-neutral-500 tabular-nums shrink-0">
                      {loading ? '…' : `${available} available`}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {!loading && available === 0 ? empty : description}
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-3 !py-1.5"
                    disabled={loading || available === 0}
                    onClick={() => start(key)}
                  >
                    Start {loading || available === 0 ? '' : `(${Math.min(size, available)} cards)`}
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
