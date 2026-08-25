import {
  Home,
  RotateCw,
  BookOpen,
  Layers,
  Target,
  Bot,
  GraduationCap,
  Calendar,
  BarChart3,
  Library,
  Settings,
  User,
} from 'lucide-react'

// Full destination list — desktop sidebar and mobile slide-out menu both use this.
// dueCount on Review is intentionally absent here — it's live data (real
// due-card count from reviewQueue.getDueCount), not something that belongs
// in a static config. AppShell fetches it once and passes it down as a
// prop that overrides per-item at render time. See Sidebar/BottomNav/MobileMenu.
export const primaryNav = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/review', label: 'Review', icon: RotateCw },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/flashcards', label: 'Flashcards', icon: Layers },
  { to: '/practice', label: 'Practice', icon: Target },
  { to: '/tutor', label: 'AI Tutor', icon: Bot },
  { to: '/exams', label: 'Exams', icon: GraduationCap },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Mobile bottom nav — most-frequent-only, per spec section 9 / mockup page 4.
export const mobileBottomNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/review', label: 'Review', icon: RotateCw },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/profile', label: 'Profile', icon: User },
]
