import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

// TEMPORARY — only rendered in dev builds (see App.jsx: import.meta.env.DEV
// check), so it never ships to production. Lets you eyeball the dark theme
// instantly by toggling the `dark` class directly, without going through
// Settings > Appearance or touching the saved Supabase preference at all.
// Safe to delete once the real Settings toggle has been visually reviewed.
export default function DevThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Dev only: preview dark mode (does not save to Settings)"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-neutral-300 bg-surface text-neutral-700 text-xs font-medium px-3 py-2 shadow-md hover:bg-neutral-50"
    >
      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      {dark ? 'Light preview' : 'Dark preview'}
    </button>
  )
}
