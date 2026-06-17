'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getToken, getRole, clearAuth } from '../../lib/auth'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  Smartphone,
  DollarSign,
  AlertTriangle,
  Server,
  LogOut,
  Loader2,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/devices', label: 'Devices', icon: Smartphone },
  { href: '/admin/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/admin/spam', label: 'Spam Alerts', icon: AlertTriangle },
  { href: '/admin/system', label: 'System', icon: Server },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return }
    if (getRole() !== 'admin') { router.push('/devices') }
  }, [router])

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/logout', { method: 'POST' })
    clearAuth()
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <div style={{ background: '#0A0F1E', cursor: loggingOut ? 'wait' : undefined }} className="min-h-screen">

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b"
        style={{ background: '#1A0A0A', borderColor: '#3D1515' }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-danger flex items-center justify-center">
            <span className="text-white font-bold text-xs">W</span>
          </div>
          <span className="font-bold text-white text-sm">Wacent</span>
          <span className="text-xs font-bold text-danger border border-danger/50 rounded px-1.5 py-0.5">ADMIN</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{ background: '#1A0A0A', borderColor: '#3D1515' }}
      >
        <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: '#3D1515' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-danger flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <span className="text-base font-bold text-text-primary">Wacent</span>
            <span className="ml-auto text-xs font-bold text-danger border border-danger/50 rounded px-1.5 py-0.5">
              ADMIN
            </span>
          </div>
          <button
            className="md:hidden p-1 rounded text-[#475569] hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'text-danger border-l-2 border-danger -ml-px pl-[11px]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
                style={active ? { background: 'rgba(239,68,68,0.08)' } : {}}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t" style={{ borderColor: '#3D1515' }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {loggingOut
              ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              : <LogOut className="w-4 h-4 flex-shrink-0" />}
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <main className="md:ml-60 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
