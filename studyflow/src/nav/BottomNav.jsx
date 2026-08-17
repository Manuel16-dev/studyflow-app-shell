import { NavLink } from 'react-router-dom'
import { mobileBottomNav } from './navConfig'

export default function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-neutral-200 pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <ul className="flex items-stretch justify-between">
        {mobileBottomNav.map(({ to, label, icon: Icon, dueCount }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'relative flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium min-h-[52px]',
                  isActive ? 'text-primary' : 'text-neutral-500',
                ].join(' ')
              }
            >
              <span className="relative">
                <Icon className="w-5 h-5" strokeWidth={2} />
                {!!dueCount && (
                  <span
                    className="absolute -top-1 -right-1.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-danger text-white text-[9px] font-semibold"
                    aria-label={`${dueCount} due`}
                  >
                    {dueCount}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
