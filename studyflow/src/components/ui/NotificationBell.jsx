import { useState } from 'react'
import { Bell } from 'lucide-react'

// Lives in the same header row as the StudyFlow logo/name (TopBar on
// mobile, Sidebar on desktop) rather than on individual pages — it's
// app-level chrome, not a Dashboard-specific control. Self-contained
// open/close state since there's no real notifications backend yet
// (Phase 3) — just an honest empty state, same as before.
export default function NotificationBell({ className = '' }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-md text-neutral-700 hover:bg-neutral-100"
      >
        <Bell className="w-[18px] h-[18px]" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-neutral-200 rounded-md shadow-lg p-3 z-30">
          <p className="text-sm text-neutral-500">No notifications yet.</p>
        </div>
      )}
    </div>
  )
}
