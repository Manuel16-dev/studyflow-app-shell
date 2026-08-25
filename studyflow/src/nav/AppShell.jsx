import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import MobileMenu from './MobileMenu'
import { getDueCount } from '../lib/reviewQueue'
import { getStreakDays } from '../lib/studySessionsStore'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  // Real due-card count for the Review nav badge, fetched once here so all
  // three nav surfaces (desktop sidebar, bottom nav, mobile slide-out) stay
  // in sync from one source instead of each guessing. null while loading —
  // treated as 0 (badge hidden) rather than showing a stale number.
  const [reviewDueCount, setReviewDueCount] = useState(null)

  // Real streak (study_sessions table, same source Dashboard uses) —
  // replaces the "12 day streak" hardcoded in Sidebar/MobileMenu. null
  // while loading, so those components can show "—" instead of a stale 12.
  const [streakDays, setStreakDays] = useState(null)

  useEffect(() => {
    getDueCount().then(setReviewDueCount)
    getStreakDays().then(setStreakDays)
  }, [])

  return (
    <div className="min-h-screen md:flex">
      <Sidebar reviewDueCount={reviewDueCount} streakDays={streakDays} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav reviewDueCount={reviewDueCount} />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        reviewDueCount={reviewDueCount}
        streakDays={streakDays}
      />
    </div>
  )
}
