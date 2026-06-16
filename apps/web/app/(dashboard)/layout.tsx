import Link from 'next/link'

const navItems = [
  { href: '/devices', label: 'Devices' },
  { href: '/messages', label: 'Messages' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/webhooks', label: 'Webhooks' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/api-keys', label: 'API Keys' },
  { href: '/billing', label: 'Billing' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="px-6 py-5 border-b">
          <span className="text-lg font-bold text-green-600">Wazap</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
