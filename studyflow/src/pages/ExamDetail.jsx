import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, CalendarClock, Lightbulb } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ProgressRing from '../components/ui/ProgressRing'
import { mockExams } from '../data/mockExams'

const severityLabel = { weak: 'Weak', attention: 'Attention', mastered: 'Strong' }

export default function ExamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const exam = mockExams.find((e) => e.id === id)

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
          <p className="flex items-center gap-1.5 text-sm text-neutral-500 mt-1">
            <CalendarClock className="w-4 h-4" />
            {exam.daysLeft} day{exam.daysLeft === 1 ? '' : 's'} remaining
          </p>
        </div>
        <div className="flex flex-col items-center shrink-0">
          <ProgressRing value={exam.readiness} size={72} strokeWidth={7} label="ready" />
        </div>
      </Card>

      <Card title="Readiness by topic">
        <div className="flex flex-col gap-4">
          {exam.topics.map((topic) => (
            <div key={topic.name}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-medium text-neutral-900">{topic.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={topic.severity}>{severityLabel[topic.severity]}</Badge>
                  <span className="text-xs text-neutral-500 tabular-nums w-9 text-right">{topic.mastery}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden" role="img" aria-label={`${topic.name}: ${topic.mastery}% mastery, ${severityLabel[topic.severity]}`}>
                <div
                  className={`h-full rounded-full ${
                    topic.severity === 'weak' ? 'bg-danger' : topic.severity === 'attention' ? 'bg-accent' : 'bg-secondary'
                  }`}
                  style={{ width: `${topic.mastery}%` }}
                />
              </div>
              {topic.severity !== 'mastered' && (
                <button
                  type="button"
                  onClick={() => navigate(`/subjects/${exam.subjectId}`)}
                  className="text-xs font-medium text-primary hover:underline mt-1.5"
                >
                  Review {topic.name} \u2192
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Preparation recommendations">
        <ul className="flex flex-col gap-3">
          {exam.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
              <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              {rec}
            </li>
          ))}
        </ul>
      </Card>

      <Button variant="primary" className="self-start" onClick={() => navigate('/review')}>
        Start Review
      </Button>
    </div>
  )
}
