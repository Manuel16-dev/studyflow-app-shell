import { Menu, BookOpen } from 'lucide-react'
import NotificationBell from '../components/ui/NotificationBell'

export default function TopBar({ onMenuClick }) {
  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-neutral-200 bg-surface sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-white">
          <BookOpen className="w-3.5 h-3.5" />
        </span>
        <span className="font-semibold text-neutral-900">StudyFlow</span>
      </div>
      <div className="flex items-center gap-1 -mr-2">
        <NotificationBell />
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 rounded-md text-neutral-700 hover:bg-neutral-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
