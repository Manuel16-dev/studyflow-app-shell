import { useNavigate } from 'react-router-dom'
import { Plus, Bell, CheckCircle2, FilePlus2, ClipboardCheck, Clock3, Flame } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import ProgressRing from '../components/ui/ProgressRing'
import Card from '../components/ui/Card'
import {
  mockUser,
  mockKpis,
  mockContinueReview,
  mockNeedsAttention,
  mockUpcomingExams,
  mockStudyPlan,
  mockRecentActivity,
} from '../data/mockDashboard'

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

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-4">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900">
            {greeting()}, {mockUser.name} 👋
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">Let's make today count.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" className="hidden sm:inline-flex">
            <Plus className="w-4 h-4" />
            Quick Add
          </Button>
          <button
            type="button"
            aria-label="Notifications"
            className="p-2.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-neutral-500">Reviews Due</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{mockKpis.reviewsDue}</p>
          <div className="h-1.5 rounded-full bg-neutral-100 mt-2 overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full"
              style={{ width: `${mockKpis.reviewsDueProgress}%` }}
            />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">New Cards</p>
          <p className="text-2xl font-semibold text-neutral-900 mt-1">{mockKpis.newCards}</p>
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
          <p className="text-sm text-neutral-500 mb-4">You have {mockContinueReview.cardsDue} cards due</p>
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
            {mockUpcomingExams.map((exam) => (
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
            {mockStudyPlan.map((item) => (
              <li key={item.time + item.title} className="flex items-center gap-3">
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
