import { TrendingUp, Layers, Target } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SimpleBarChart from '../components/charts/SimpleBarChart'
import { mockSubjects } from '../data/mockSubjects'
import { mockNeedsAttention } from '../data/mockDashboard'
import {
  mockRetentionTrend,
  mockCardsReviewedTrend,
  mockConsistency,
  mockProgressSummary,
} from '../data/mockProgress'

const severityLabel = { weak: 'Weak', attention: 'Attention', mastered: 'Strong' }

function Kpi({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-3">
      <span className="flex items-center justify-center w-10 h-10 rounded-md bg-primary-light text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <p className="text-lg font-semibold text-neutral-900 leading-tight">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </Card>
  )
}

export default function Progress() {
  const weekTotal = mockCardsReviewedTrend.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Progress</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Is it actually working? Here&rsquo;s the honest picture.</p>
      </div>

      {/* Primary metrics only — deliberately no total-clicks / vanity-metric
          tiles here, per spec 4.7. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={TrendingUp} label="Retention rate" value={`${mockProgressSummary.retention}%`} />
        <Kpi icon={Layers} label="Cards reviewed this week" value={mockProgressSummary.cardsReviewedThisWeek} />
        <Kpi icon={Target} label="Overall mastery" value={`${mockProgressSummary.overallMastery}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Retention, last 7 days">
          <SimpleBarChart
            data={mockRetentionTrend}
            unit="%"
            color="var(--color-primary)"
            summary={`Retention ranged from ${Math.min(...mockRetentionTrend.map((d) => d.value))}% to ${Math.max(...mockRetentionTrend.map((d) => d.value))}% over the last 7 days.`}
          />
        </Card>

        <Card title="Cards reviewed, last 7 days">
          <SimpleBarChart
            data={mockCardsReviewedTrend}
            color="var(--color-secondary)"
            summary={`${weekTotal} cards reviewed in total over the last 7 days.`}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Mastery by subject">
          <div className="flex flex-col gap-3">
            {mockSubjects.map((s) => (
              <div key={s.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-neutral-700">{s.name}</span>
                  <span className="text-neutral-500 tabular-nums">{s.mastery}%</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden" role="img" aria-label={`${s.name}: ${s.mastery}% mastery`}>
                  <div className="h-full bg-primary rounded-full" style={{ width: `${s.mastery}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Weak topics">
          <div className="flex flex-col gap-3">
            {mockNeedsAttention.map((t) => (
              <div key={t.topic} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{t.topic}</p>
                  <p className="text-xs text-neutral-500">{t.subject}</p>
                </div>
                <Badge variant={t.severity}>{severityLabel[t.severity]} {t.mastery}%</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Consistency">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-semibold text-neutral-900">{mockConsistency.streakDays}</p>
            <p className="text-xs text-neutral-500">day streak</p>
          </div>
          <div className="flex gap-1.5" role="img" aria-label={`Studied ${mockConsistency.last7Days.filter(Boolean).length} of the last 7 days`}>
            {mockConsistency.last7Days.map((studied, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-md ${studied ? 'bg-secondary' : 'bg-neutral-100'}`}
                title={studied ? 'Studied' : 'No activity'}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
