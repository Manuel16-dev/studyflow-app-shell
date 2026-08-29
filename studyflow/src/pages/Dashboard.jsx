import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle2, FilePlus2, ClipboardCheck, Clock3, Flame } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ProgressRing from '../components/ui/ProgressRing'
import Card from '../components/ui/Card'
import { useAuth } from '../lib/AuthContext'
import { getDueCount, getNewCardCount } from '../lib/reviewQueue'
import { getStudyTimeTodayMinutes, getStreakDays } from '../lib/studySessionsStore'
import { getSettings } from '../lib/settingsStore'
import { getWeakSubjects } from '../lib/subjectsStore'
import { getExams } from '../lib/examsStore'
import { getEstimatedReviewMinutes, getRecentActivity } from '../lib/activityStore'
import { getTodaysPlanBlocks } from '../lib/planBlocksStore'

const activityIcons = {
  review: CheckCircle2,
  create: FilePlus2,
  practice: ClipboardCheck,
  study: Clock3,
}

const severityLabel = { weak: 'Weak', attention: 'Attention', mastered: 'Strong' }

function severityOf(mastery) {
  if (mastery < 55) return 'weak'
  if (mastery < 75) return 'attention'
  return 'mastered'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Good night'
}

// "4:30 PM" -> minutes since midnight, for sorting today's plan blocks.
function parseTimeToMinutes(time) {
  const [, h, m, period] = time.match(/(\d+):(\d+)\s*(AM|PM)/i) ?? []
  let hours = Number(h) % 12
  if (/PM/i.test(period)) hours += 12
  return hours * 60 + Number(m)
}

// Total minutes -> "1h 24m" / "24m", for Study Time display.
function formatMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there'

  // Real counts from the live subjects/cards/review stores — replaces the
  // static reviewsDue/newCards mock values. null = still loading.
  const [reviewsDue, setReviewsDue] = useState(null)
  const [newCards, setNewCards] = useState(null)

  // Real study time/streak (study_sessions table) and daily goal (settings.
  // studyBehavior.dailyTargetMinutes, already a real, user-set field) —
  // replaces mockKpis.studyTimeToday/streakDays and the previously-frozen
  // reviewsDueProgress/dailyGoalPercent, which were always 72 regardless of
  // actual progress.
  const [studyMinutesToday, setStudyMinutesToday] = useState(null)
  const [streakDays, setStreakDays] = useState(null)
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(null)

  // Real "Needs Attention" (subject-level FSRS mastery, subjectsStore.
  // getWeakSubjects — already built, just wasn't wired here) and real
  // "Upcoming Exams" (examsStore, backed by the new exams table). null =
  // still loading.
  const [weakSubjects, setWeakSubjects] = useState(null)
  const [upcomingExams, setUpcomingExams] = useState(null)

  // Real estimated review time (derived from historical study_sessions/
  // review_logs, see activityStore) and Recent Activity (merged from
  // review_logs + study_sessions + cards.created_at — no activity-log table
  // exists, this builds an honest feed from data already being written).
  // Both replace mockDashboard's last two frozen fields. null = still loading.
  const [estimatedMinutes, setEstimatedMinutes] = useState(null)
  const [recentActivity, setRecentActivity] = useState(null)

  // Real today's plan (plan_blocks table via planBlocksStore) — replaces
  // mockPlanBlocks. null = still loading.
  const [todaysPlan, setTodaysPlan] = useState(null)

  useEffect(() => {
    getDueCount().then((count) => {
      setReviewsDue(count)
      getEstimatedReviewMinutes(count).then(setEstimatedMinutes)
    })
    getNewCardCount().then(setNewCards)
    getStudyTimeTodayMinutes().then(setStudyMinutesToday)
    getStreakDays().then(setStreakDays)
    getSettings().then((s) => setDailyGoalMinutes(s?.studyBehavior?.dailyTargetMinutes ?? null))
    getWeakSubjects(3).then(setWeakSubjects)
    getExams().then((exams) => setUpcomingExams(exams.slice(0, 3)))
    getRecentActivity(4).then(setRecentActivity)
    getTodaysPlanBlocks().then((blocks) =>
      setTodaysPlan([...blocks].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)))
    )
  }, [])

  // % of today's study-time goal reached so far. null while any input is
  // still loading, so the UI can show "—" instead of a misleading 0%.
  const goalPercent =
    studyMinutesToday == null || !dailyGoalMinutes
      ? null
      : Math.min(100, Math.round((studyMinutesToday / dailyGoalMinutes) * 100))

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-4">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">
            {greeting()}, {displayName}
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">Let's make today count.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => navigate('/subjects')}>
            <Plus className="w-4 h-4" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-neutral-500">Reviews Due</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{reviewsDue ?? "—"}</p>
          <div className="h-1.5 rounded-full bg-neutral-100 mt-2 overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full"
              style={{ width: `${goalPercent ?? 0}%` }}
            />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">New Cards</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{newCards ?? "—"}</p>
          <p className="text-xs text-neutral-400 mt-2">today</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Study Time</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">
            {studyMinutesToday == null ? "—" : formatMinutes(studyMinutesToday)}
          </p>
          <p className="text-xs text-neutral-400 mt-2">today</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Streak</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1 flex items-center gap-1">
            {streakDays ?? "—"}
            <Flame className="w-4 h-4 text-accent" />
          </p>
          <p className="text-xs text-neutral-400 mt-2">days</p>
        </Card>
      </div>

      {/* Continue Review / Needs Attention / Upcoming Exams */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Continue Review">
          <p className="text-sm text-neutral-500 mb-4">You have {reviewsDue ?? "—"} cards due</p>
          <div className="flex items-center gap-4">
            <ProgressRing value={goalPercent ?? 0} label="Daily Goal" />
            <div className="flex-1">
              <Button variant="primary" className="w-full" onClick={() => navigate('/review')}>
                Start Review
              </Button>
              <p className="text-xs text-neutral-400 mt-2">
                Estimated time: {estimatedMinutes == null ? "—" : `${estimatedMinutes} min`}
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Needs Attention"
          action={
            <button
              type="button"
              onClick={() => navigate('/subjects')}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </button>
          }
        >
          <ul className="flex flex-col gap-3">
            {weakSubjects == null ? (
              <li className="text-sm text-neutral-400">Loading…</li>
            ) : weakSubjects.length === 0 ? (
              <li className="text-sm text-neutral-400">Nothing needs attention yet.</li>
            ) : (
              weakSubjects.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900 truncate">{s.name}</p>
                  <Badge variant={severityOf(s.mastery)}>{severityLabel[severityOf(s.mastery)]}</Badge>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card
          title="Upcoming Exams"
          action={
            <button
              type="button"
              onClick={() => navigate('/exams')}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </button>
          }
        >
          <ul className="flex flex-col gap-3">
            {upcomingExams == null ? (
              <li className="text-sm text-neutral-400">Loading…</li>
            ) : upcomingExams.length === 0 ? (
              <li className="text-sm text-neutral-400">No upcoming exams.</li>
            ) : (
              upcomingExams.map((exam) => (
                <li key={exam.id} className="flex items-center gap-3">
                  <span className="w-1 self-stretch rounded-full bg-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">{exam.name}</p>
                  </div>
                  <p className="text-xs text-neutral-400 shrink-0">{exam.daysLeft} days left</p>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      {/* Study Plan / Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
        <Card
          title="Study Plan for Today"
          action={
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="text-xs font-medium text-primary hover:underline"
            >
              View full plan
            </button>
          }
        >
          {todaysPlan == null ? (
            <p className="text-sm text-neutral-400">Loading&hellip;</p>
          ) : todaysPlan.length === 0 ? (
            <p className="text-sm text-neutral-400">Nothing scheduled today. <button type="button" onClick={() => navigate('/calendar')} className="text-primary hover:underline">Add a block</button>.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {todaysPlan.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-neutral-400 w-16 shrink-0">{item.time}</span>
                  <span className="text-sm text-neutral-900 flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-neutral-400 shrink-0">{item.duration}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent Activity"
          action={
            <button
              type="button"
              onClick={() => navigate('/progress')}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all activity
            </button>
          }
        >
          <ul className="flex flex-col gap-3">
            {recentActivity == null ? (
              <li className="text-sm text-neutral-400">Loading…</li>
            ) : recentActivity.length === 0 ? (
              <li className="text-sm text-neutral-400">No activity yet — start a review to get going.</li>
            ) : (
              recentActivity.map((item, i) => {
                const Icon = activityIcons[item.kind]
                return (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-light text-primary shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm text-neutral-900 flex-1 truncate">{item.text}</span>
                    <span className="text-xs text-neutral-400 shrink-0">{item.time}</span>
                  </li>
                )
              })
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}
