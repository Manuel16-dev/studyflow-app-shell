import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import Card from './Card'

// First run checklist for the Dashboard. `progress` comes from
// onboardingStore.getOnboardingProgress() (null while loading). Renders
// nothing once all three steps are done, so it never nags returning users.
export default function GettingStarted({ progress }) {
  const navigate = useNavigate()
  if (!progress) return null
  const { hasSubject, hasCards, hasReviewed, firstSubjectId } = progress
  if (hasSubject && hasCards && hasReviewed) return null

  const steps = [
    {
      done: hasSubject,
      title: 'Create a subject',
      hint: 'A subject is a course or topic, like Calculus.',
      to: '/subjects',
      enabled: true,
    },
    {
      done: hasCards,
      title: 'Add your first cards',
      hint: 'Upload your notes or slides and get cards in about 30 seconds.',
      to: firstSubjectId ? `/subjects/${firstSubjectId}/generate` : '/subjects',
      enabled: hasSubject,
    },
    {
      done: hasReviewed,
      title: 'Do your first review',
      hint: 'Rate how well you remember. StudyFlow schedules the rest.',
      to: '/review',
      enabled: hasCards,
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const current = steps.findIndex((s) => !s.done)

  return (
    <Card title="Get started" action={<span className="text-xs text-neutral-500 tabular-nums">{doneCount} of 3</span>}>
      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const isCurrent = i === current
          return (
            <li key={s.title}>
              <button
                type="button"
                disabled={s.done || !s.enabled}
                onClick={() => navigate(s.to)}
                className={[
                  'w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
                  isCurrent ? 'border-primary bg-primary-light' : 'border-neutral-200',
                  !s.done && s.enabled ? 'hover:border-primary' : '',
                  !s.done && !s.enabled ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-xs font-semibold',
                    s.done ? 'bg-secondary text-white' : 'bg-neutral-100 text-neutral-500',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {s.done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium ${s.done ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                    {s.title}
                  </span>
                  {!s.done && <span className="block text-xs text-neutral-500 mt-0.5">{s.hint}</span>}
                </span>
                {isCurrent && <ArrowRight className="w-4 h-4 text-primary-text shrink-0" aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
