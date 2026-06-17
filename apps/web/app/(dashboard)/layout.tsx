'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { clearAuth } from '../../lib/auth'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Smartphone,
  MessageSquare,
  Megaphone,
  Users,
  Webhook,
  BarChart2,
  Key,
  CreditCard,
  Shield,
  LogOut,
  Loader2,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/devices', label: 'Devices', icon: Smartphone },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/api-keys', label: 'API Keys', icon: Key },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/best-practices', label: 'Best Practices', icon: Shield },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false) }, [pathname])

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
        style={{ background: '#0D1421', borderColor: '#1E2D45' }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#00D68F] flex items-center justify-center">
            <span className="text-[#0A0F1E] font-bold text-xs">W</span>
          </div>
          <span className="font-bold text-white text-sm">Wacent</span>
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
        style={{ background: '#0D1421', borderColor: '#1E2D45' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: '#1E2D45' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-background font-bold text-xs">W</span>
            </div>
            <span className="text-base font-bold text-text-primary">Wacent</span>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </div>
          <button
            className="md:hidden p-1 rounded text-[#475569] hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'text-primary border-l-2 border-primary -ml-px pl-[11px]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
                style={active ? { background: 'rgba(0,214,143,0.08)' } : {}}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t" style={{ borderColor: '#1E2D45' }}>
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

      {/* Main content */}
      <main className="md:ml-60 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
