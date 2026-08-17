import { NavLink } from 'react-router-dom'
import { X, Flame, BookOpen } from 'lucide-react'
import { primaryNav } from './navConfig'

export default function MobileMenu({ open, onClose }) {
  if (!open) return null

  return (
    <div className="md:hidden fixed inset-0 z-40">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl flex flex-col animate-in slide-in-from-left">
        <div className="flex items-center justify-between h-16 px-5 shrink-0 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary text-white">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="font-semibold text-neutral-900">StudyFlow</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-md text-neutral-500 hover:bg-neutral-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" aria-label="Full navigation">
          {primaryNav.map(({ to, label, icon: Icon, dueCount }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium',
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
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-neutral-200">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Flame className="w-4 h-4 text-accent" />
            <span>12 day streak</span>
          </div>
        </div>
      </div>
    </div>
  )
}
