import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import MobileMenu from './MobileMenu'

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
