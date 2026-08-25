import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CalendarClock, Lightbulb } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ProgressRing from '../components/ui/ProgressRing'
import { getExam } from '../lib/examsStore'
import { getCardsWithMastery } from '../lib/cardsStore'

const severityLabel = { weak: 'Weak', attention: 'Attention', mastered: 'Strong' }

function severityOf(mastery) {
  if (mastery < 55) return 'weak'
  if (mastery < 75) return 'attention'
  return 'mastered'
}

export default function ExamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [exam, setExam] = useState(undefined) // undefined = loading, null = not found
  const [cards, setCards] = useState([])

  useEffect(() => {
    getExam(id).then((e) => {
      setExam(e)
      if (e) getCardsWithMastery(e.subjectId).then(setCards)
    })
  }, [id])

  if (exam === undefined) return null

  if (!exam) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <p className="text-neutral-500">Exam not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/exams')}>
          Back to Exams
        </Button>
      </div>
    )
  }

  // Weakest cards first — capped at 8 so the list stays scannable. No
  // per-topic model exists (cards only carry subjectId), so this is real
  // card-level FSRS mastery instead of a fabricated topic breakdown.
  const weakestCards = cards.slice(0, 8)
  const weakCount = cards.filter((c) => c.mastery < 55).length

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/exams')}
        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 -ml-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Exams
      </button>

      <Card className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{exam.name}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{exam.subjectName}</p>
          <p className="flex items-center gap-1.5 text-sm text-neutral-500 mt-1">
            <CalendarClock className="w-4 h-4" />
            {exam.daysLeft} day{exam.daysLeft === 1 ? '' : 's'} remaining
          </p>
        </div>
        <div className="flex flex-col items-center shrink-0">
          <ProgressRing value={exam.readiness} size={72} strokeWidth={7} label="ready" />
        </div>
      </Card>

      <Card title="Weakest cards">
        {cards.length === 0 ? (
          <p className="text-sm text-neutral-500">No cards in this subject yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {weakestCards.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-medium text-neutral-900 truncate">{c.front}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={severityOf(c.mastery)}>{severityLabel[severityOf(c.mastery)]}</Badge>
                    <span className="text-xs text-neutral-500 tabular-nums w-9 text-right">{c.mastery}%</span>
                  </div>
                </div>
                <div
                  className="h-2 rounded-full bg-neutral-100 overflow-hidden"
                  role="img"
                  aria-label={`${c.front}: ${c.mastery}% mastery, ${severityLabel[severityOf(c.mastery)]}`}
                >
                  <div
                    className={`h-full rounded-full ${
                      severityOf(c.mastery) === 'weak'
                        ? 'bg-danger'
                        : severityOf(c.mastery) === 'attention'
                          ? 'bg-accent'
                          : 'bg-secondary'
                    }`}
                    style={{ width: `${c.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {cards.length > 0 && (
        <Card title="Preparation recommendation">
          <div className="flex items-start gap-2 text-sm text-neutral-700">
            <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            {weakCount === 0
              ? 'No cards below 55% recall right now — keep up regular review to hold that.'
              : `${weakCount} card${weakCount === 1 ? ' is' : 's are'} below 55% recall. Review those first — they carry the most exam risk.`}
          </div>
        </Card>
      )}

      <Button variant="primary" className="self-start" onClick={() => navigate('/review')}>
        Start Review
      </Button>
    </div>
  )
}
