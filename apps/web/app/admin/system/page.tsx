'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Server, MessageSquare, Smartphone, Users, Clock } from 'lucide-react'
import { StatCard } from '../../../components/ui/StatCard'
import { API_URL } from '../../../lib/config'

interface SystemInfo {
  totalMessages: number
  totalDevices: number
  totalUsers: number
  uptime: string
}

export default function AdminSystemPage() {
  const router = useRouter()
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(() => {
    const t = localStorage.getItem('wc_token')
    if (!t) router.push('/login')
    return t
  }, [router])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    void fetch(`${API_URL}/admin/system`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data: SystemInfo }) => {
        setInfo(json.data)
        setLoading(false)
      })
  }, [getToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">System Health</h1>
        <p className="text-sm text-text-secondary mt-1">Platform infrastructure stats</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} metric={info?.totalMessages ?? 0} label="Total Messages" />
        <StatCard icon={Smartphone} metric={info?.totalDevices ?? 0} label="Total Devices" />
        <StatCard icon={Users} metric={info?.totalUsers ?? 0} label="Total Users" />
        <StatCard icon={Clock} metric={info?.uptime ?? '—'} label="API Uptime" />
      </div>

      <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">API Server</h2>
          <span className="text-xs text-primary border border-primary/30 rounded px-1.5 py-0.5 ml-auto">Online</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-muted text-xs">Node.js Runtime</p>
            <p className="text-text-primary font-medium">Node.js 20 LTS</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Framework</p>
            <p className="text-text-primary font-medium">Hono (TypeScript)</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Queue</p>
            <p className="text-text-primary font-medium">BullMQ / Redis</p>
          </div>
          <div>
            <p className="text-text-muted text-xs">Database</p>
            <p className="text-text-primary font-medium">PostgreSQL 16</p>
          </div>
        </div>
      </div>
    </div>
  )
}
