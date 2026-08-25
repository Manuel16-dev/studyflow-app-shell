import { NavLink } from 'react-router-dom'
import { Flame, BookOpen } from 'lucide-react'
import { primaryNav } from './navConfig'
import NotificationBell from '../components/ui/NotificationBell'

export default function Sidebar({ reviewDueCount, streakDays }) {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-neutral-200 bg-surface h-screen sticky top-0">
      <div className="flex items-center justify-between gap-2 px-5 h-16 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-white shrink-0">
            <BookOpen className="w-4 h-4" />
          </span>
          <span className="font-semibold text-neutral-900 tracking-tight truncate">StudyFlow</span>
        </div>
        <NotificationBell className="shrink-0 -mr-2" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" aria-label="Main navigation">
        {primaryNav.map(({ to, label, icon: Icon }) => {
          const dueCount = to === '/review' ? reviewDueCount : null
          return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-light text-primary'
                  : 'text-neutral-700 hover:bg-neutral-100',
              ].join(' ')
            }
          >
            <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
            <span className="flex-1">{label}</span>
            {!!dueCount && (
              <span
                className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[11px] font-semibold"
                aria-label={`${dueCount} due`}
              >
                {dueCount}
              </span>
            )}
          </NavLink>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-neutral-200">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <Flame className="w-4 h-4 text-accent" />
          <span>{streakDays ?? '—'} day streak</span>
        </div>
      </div>
    </aside>
  )
}
