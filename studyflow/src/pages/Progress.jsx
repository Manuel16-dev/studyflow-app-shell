import { useEffect, useState } from 'react'
import { TrendingUp, Layers, Target } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SimpleBarChart from '../components/charts/SimpleBarChart'
import { getSubjects, getSubjectMastery, getWeakSubjects } from '../lib/subjectsStore'
import { getStreakDays } from '../lib/studySessionsStore'
import {
  getRetentionRate,
  getCardsReviewedThisWeek,
  getOverallMastery,
  getWeeklyTrends,
  getConsistencyLast7Days,
} from '../lib/progressStore'

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

// "—" instead of "0%"/"0" when there's genuinely no data yet (new account,
// nothing reviewed) — 0 would misleadingly read as "reviewed everything
// and got it all wrong" rather than "hasn't started".
const fmtPct = (v) => (v == null ? '—' : `${v}%`)
const fmtNum = (v) => (v == null ? '—' : v)

export default function Progress() {
  const [subjects, setSubjects] = useState([])
  const [mastery, setMastery] = useState({})
  const [weakSubjects, setWeakSubjects] = useState([])
  const [summary, setSummary] = useState({ retention: null, cardsReviewedThisWeek: null, overallMastery: null })
  const [retentionTrend, setRetentionTrend] = useState([])
  const [cardsTrend, setCardsTrend] = useState([])
  const [consistency, setConsistency] = useState({ streakDays: 0, last7Days: [] })

  useEffect(() => {
    getSubjects().then(setSubjects)
    getSubjectMastery().then(setMastery)
    getWeakSubjects().then(setWeakSubjects)
    getWeeklyTrends().then(({ retentionTrend, cardsTrend }) => {
      setRetentionTrend(retentionTrend)
      setCardsTrend(cardsTrend)
    })
    Promise.all([getRetentionRate(), getCardsReviewedThisWeek(), getOverallMastery()]).then(
      ([retention, cardsReviewedThisWeek, overallMastery]) =>
        setSummary({ retention, cardsReviewedThisWeek, overallMastery })
    )
    Promise.all([getStreakDays(), getConsistencyLast7Days()]).then(([streakDays, last7Days]) =>
      setConsistency({ streakDays, last7Days })
    )
  }, [])

  const weekTotal = cardsTrend.reduce((sum, d) => sum + d.value, 0)
  const retentionValues = retentionTrend.map((d) => d.value)

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">Progress</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Is it actually working? Here&rsquo;s the honest picture.</p>
      </div>

      {/* Primary metrics only — deliberately no total-clicks / vanity-metric
          tiles here, per spec 4.7. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={TrendingUp} label="Retention rate" value={fmtPct(summary.retention)} />
        <Kpi icon={Layers} label="Cards reviewed this week" value={fmtNum(summary.cardsReviewedThisWeek)} />
        <Kpi icon={Target} label="Overall mastery" value={fmtPct(summary.overallMastery)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Retention, last 7 days">
          <SimpleBarChart
            data={retentionTrend}
            unit="%"
            color="var(--color-primary)"
            summary={
              retentionValues.length
                ? `Retention ranged from ${Math.min(...retentionValues)}% to ${Math.max(...retentionValues)}% over the last 7 days.`
                : 'No reviews in the last 7 days.'
            }
          />
        </Card>

        <Card title="Cards reviewed, last 7 days">
          <SimpleBarChart
            data={cardsTrend}
            color="var(--color-secondary)"
            summary={`${weekTotal} cards reviewed in total over the last 7 days.`}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Mastery by subject">
          <div className="flex flex-col gap-3">
            {subjects.map((s) => {
              const m = mastery[s.id] ?? 0
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-neutral-700">{s.name}</span>
                    <span className="text-neutral-500 tabular-nums">{m}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-100 overflow-hidden" role="img" aria-label={`${s.name}: ${m}% mastery`}>
                    <div className="h-full bg-primary rounded-full" style={{ width: `${m}%` }} />
                  </div>
                </div>
              )
            })}
            {subjects.length === 0 && <p className="text-sm text-neutral-500">No subjects yet.</p>}
          </div>
        </Card>

        <Card title="Weak topics">
          <div className="flex flex-col gap-3">
            {weakSubjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{s.name}</p>
                </div>
                <Badge variant={s.mastery < 40 ? 'weak' : 'attention'}>
                  {severityLabel[s.mastery < 40 ? 'weak' : 'attention']} {s.mastery}%
                </Badge>
              </div>
            ))}
            {weakSubjects.length === 0 && <p className="text-sm text-neutral-500">Nothing needs attention right now.</p>}
          </div>
        </Card>
      </div>

      <Card title="Consistency">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-semibold text-neutral-900">{consistency.streakDays}</p>
            <p className="text-xs text-neutral-500">day streak</p>
          </div>
          <div className="flex gap-1.5" role="img" aria-label={`Studied ${consistency.last7Days.filter(Boolean).length} of the last 7 days`}>
            {consistency.last7Days.map((studied, i) => (
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

