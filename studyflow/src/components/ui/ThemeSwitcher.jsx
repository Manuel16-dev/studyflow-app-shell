import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

const CurrentIcon = { light: Sun, dark: Moon, system: Monitor }

// Sits mostly off-screen against the right edge — only the handle (a small
// square with the current theme's icon) peeks out. Tapping the handle
// slides the option panel out to its left; picking an option applies the
// theme immediately (via AuthContext.setTheme, same source of truth the
// Settings > Appearance page uses) and the panel auto-collapses back a
// moment later. Positioned above BottomNav on mobile (md:hidden nav), lower
// on desktop where there's no bottom nav to clear.
export default function ThemeSwitcher() {
  const { theme, setTheme } = useAuth()
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  function choose(value) {
    setTheme(value)
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 550)
  }

  const HandleIcon = CurrentIcon[theme] ?? Monitor

  return (
    <div
      className="fixed right-0 z-40 flex items-center bottom-[calc(52px+env(safe-area-inset-bottom)+12px)] md:bottom-6"
      role="group"
      aria-label="Theme switcher"
    >
      <div
        className={[
          'overflow-hidden transition-all duration-300 ease-out',
          open ? 'w-[84px] opacity-100' : 'w-0 opacity-0',
        ].join(' ')}
      >
        <div className="flex items-center gap-1 bg-surface border border-neutral-200 border-r-0 rounded-l-xl shadow-md py-1.5 pl-2 pr-1 whitespace-nowrap">
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              title={label}
              aria-label={label}
              aria-pressed={theme === value}
              className={[
                'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
                'focus-visible:outline-2 focus-visible:outline-primary',
                theme === value
                  ? 'bg-primary-light text-primary'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close theme switcher' : 'Open theme switcher'}
        className="w-10 h-10 shrink-0 flex items-center justify-center bg-surface border border-neutral-200 rounded-l-xl shadow-md text-neutral-600 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <HandleIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
