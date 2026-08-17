import { useNavigate } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import ProgressRing from '../components/ui/ProgressRing'
import { mockExams } from '../data/mockExams'

function readinessColor(readiness) {
  if (readiness >= 75) return 'text-secondary'
  if (readiness >= 55) return 'text-accent'
  return 'text-danger'
}

export default function Exams() {
  const navigate = useNavigate()

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Exams</h1>
        <p className="text-sm text-neutral-500 mt-0.5">How ready you are, by exam \u2014 not just how much time is left.</p>
      </div>

      {mockExams.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
          No upcoming exams. Add one from a subject to start tracking readiness.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {mockExams.map((exam) => (
            <button
              key={exam.id}
              type="button"
              onClick={() => navigate(`/exams/${exam.id}`)}
              className="text-left bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{exam.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-neutral-500 mt-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {exam.daysLeft} day{exam.daysLeft === 1 ? '' : 's'} left
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${readinessColor(exam.readiness)}`}>
                  {exam.readiness >= 75 ? 'On track' : exam.readiness >= 55 ? 'Needs work' : 'At risk'}
                </span>
                <ProgressRing value={exam.readiness} size={52} strokeWidth={5} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
