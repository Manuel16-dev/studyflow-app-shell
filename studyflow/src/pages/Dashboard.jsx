import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Bell, CheckCircle2, FilePlus2, ClipboardCheck, Clock3, Flame } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ProgressRing from '../components/ui/ProgressRing'
import Card from '../components/ui/Card'
import { useAuth } from '../lib/AuthContext'
import { mockKpis, mockContinueReview, mockNeedsAttention, mockRecentActivity } from '../data/mockDashboard'
import { mockExams } from '../data/mockExams'
import { mockPlanBlocks } from '../data/mockPlan'
import { getDueCount, getNewCardCount } from '../lib/reviewQueue'

const activityIcons = {
  review: CheckCircle2,
  create: FilePlus2,
  practice: ClipboardCheck,
  study: Clock3,
}

const severityLabel = { weak: 'Weak', attention: 'Attention', mastered: 'Strong' }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// "4:30 PM" -> minutes since midnight, for sorting today's plan blocks.
function parseTimeToMinutes(time) {
  const [, h, m, period] = time.match(/(\d+):(\d+)\s*(AM|PM)/i) ?? []
  let hours = Number(h) % 12
  if (/PM/i.test(period)) hours += 12
  return hours * 60 + Number(m)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there'

  // Real counts from the live subjects/cards/review stores — replaces the
  // static reviewsDue/newCards mock values. null = still loading.
  const [reviewsDue, setReviewsDue] = useState(null)
  const [newCards, setNewCards] = useState(null)

  useEffect(() => {
    getDueCount().then(setReviewsDue)
    getNewCardCount().then(setNewCards)
  }, [])

  // Single source of truth: read straight from mockExams.js (same file
  // Exams.jsx uses) instead of a separate, driftable mockUpcomingExams list.
  const upcomingExams = [...mockExams].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3)

  // Today's plan, read from the same mockPlanBlocks Planner.jsx uses
  // (dayOffset 0), instead of a separate hardcoded list that could show
  // blocks that aren't actually scheduled for today.
  const todaysPlan = mockPlanBlocks
    .filter((b) => b.dayOffset === 0)
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time))

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-4">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">
            {greeting()}, {displayName} 👋
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">Let's make today count.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => navigate('/subjects')}>
            <Plus className="w-4 h-4" />
            Quick Add
          </Button>
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
              className="p-2.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              <Bell className="w-4 h-4" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-md shadow-lg p-3 z-10">
                {/* No notifications backend yet (Phase 3) — this is an
                    honest empty state, not a placeholder pretending to work. */}
                <p className="text-sm text-neutral-500">No notifications yet.</p>
              </div>
            )}
          </div>
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
              style={{ width: `${mockKpis.reviewsDueProgress}%` }}
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
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{mockKpis.studyTimeToday}</p>
          <p className="text-xs text-neutral-400 mt-2">today</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Streak</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1 flex items-center gap-1">
            {mockKpis.streakDays}
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
            <ProgressRing value={mockContinueReview.dailyGoalPercent} label="Daily Goal" />
            <div className="flex-1">
              <Button variant="primary" className="w-full" onClick={() => navigate('/review')}>
                Start Review
              </Button>
              <p className="text-xs text-neutral-400 mt-2">
                Estimated time: {mockContinueReview.estimatedMinutes} min
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
            {mockNeedsAttention.map((item) => (
              <li key={item.topic} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{item.topic}</p>
                  <p className="text-xs text-neutral-400 truncate">{item.subject}</p>
                </div>
                <Badge variant={item.severity}>{severityLabel[item.severity]}</Badge>
              </li>
            ))}
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
            {upcomingExams.map((exam) => (
              <li key={exam.name} className="flex items-center gap-3">
                <span className="w-1 self-stretch rounded-full bg-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 truncate">{exam.name}</p>
                </div>
                <p className="text-xs text-neutral-400 shrink-0">{exam.daysLeft} days left</p>
              </li>
            ))}
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
          <ul className="flex flex-col gap-3">
            {todaysPlan.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-400 w-16 shrink-0">{item.time}</span>
                <span className="text-sm text-neutral-900 flex-1 truncate">{item.title}</span>
                <span className="text-xs text-neutral-400 shrink-0">{item.duration}</span>
              </li>
            ))}
          </ul>
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
            {mockRecentActivity.map((item) => {
              const Icon = activityIcons[item.kind]
              return (
                <li key={item.text} className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-light text-primary shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm text-neutral-900 flex-1 truncate">{item.text}</span>
                  <span className="text-xs text-neutral-400 shrink-0">{item.time}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}
