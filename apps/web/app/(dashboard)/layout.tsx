'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(localStorage.getItem('wc_role') === 'admin')
  }, [])

  function handleLogout() {
    localStorage.removeItem('wc_token')
    localStorage.removeItem('wc_role')
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0A0F1E' }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col fixed inset-y-0 left-0 z-50 border-r"
        style={{ background: '#0D1421', borderColor: '#1E2D45' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#1E2D45' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-background font-bold text-xs">W</span>
            </div>
            <span className="text-base font-bold text-text-primary">Wacent</span>
            <span className="relative flex h-2 w-2 ml-auto">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/admin')
                  ? 'text-danger border-l-2 border-danger -ml-px pl-[11px]'
                  : 'text-danger/70 hover:text-danger hover:bg-danger/5'
              }`}
              style={pathname.startsWith('/admin') ? { background: 'rgba(239,68,68,0.08)' } : {}}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              Admin Panel
            </Link>
          )}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t" style={{ borderColor: '#1E2D45' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
