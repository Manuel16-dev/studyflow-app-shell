import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FlowTopBar from '../../components/ui/FlowTopBar'
import Button from '../../components/ui/Button'

const studyForOptions = ['University', 'High school', 'Certification', 'Self-study']

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0 = studying for, 1 = daily goal
  const [studyFor, setStudyFor] = useState(null)
  const [dailyGoal, setDailyGoal] = useState(30)

  function selectStudyFor(option) {
    setStudyFor(option)
    // Progressive disclosure — spec's design principle. Auto-advance once a choice is made.
    setStep(1)
  }

  function finishOnboarding() {
    // TODO: persist studyFor + dailyGoal to the user's profile once backend is wired.
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <FlowTopBar
        title="Set up your study plan"
        onBack={step === 1 ? () => setStep(0) : undefined}
        onClose={() => navigate('/')}
      />

      {/* Step progress */}
      <div className="flex gap-1.5 px-4 pt-4 max-w-sm mx-auto">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-neutral-200'}`}
          />
        ))}
      </div>

      <div className="max-w-sm mx-auto px-4 pt-8 pb-10">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">What are you studying for?</h2>
            <p className="text-sm text-neutral-500 mb-6">This helps us tailor your plan and pacing.</p>
            <div className="flex flex-wrap gap-2">
              {studyForOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectStudyFor(option)}
                  className={[
                    'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                    studyFor === option
                      ? 'bg-primary-light text-primary border-primary'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Set your daily goal</h2>
            <p className="text-sm text-neutral-500 mb-6">Recommended: 25–30 min/day</p>

            <div className="mb-2 text-2xl font-semibold text-neutral-900">{dailyGoal} min/day</div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Daily study goal in minutes"
            />
            <div className="flex justify-between text-xs text-neutral-400 mt-1 mb-8">
              <span>10 min</span>
              <span>90 min</span>
            </div>

            <Button variant="primary" className="w-full" onClick={finishOnboarding}>
              Start studying
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
