'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Smartphone, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { API_URL } from '../../lib/config'
import { authHeaders, getToken } from '../../lib/auth'

interface Overview {
  mrr: number
  arr: number
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  connectedDevices: number
  totalDevices: number
  planBreakdown: Record<string, number>
}

interface SpamAlert {
  id: string
  type: string
  userId: string
  createdAt: string
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [alerts, setAlerts] = useState<SpamAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.push('/login'); return }

    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${API_URL}/admin/overview`, { headers }),
      fetch(`${API_URL}/admin/spam-alerts?limit=5`, { headers }),
    ])
      .then(async ([ovRes, spRes]) => {
        if (ovRes.status === 403) { router.push('/overview'); return }
        const ovJson = await ovRes.json() as { data: Overview }
        const spJson = await spRes.json() as { data: SpamAlert[] }
        setOverview(ovJson.data)
        setAlerts(spJson.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!overview) {
    return <p className="text-text-secondary">Failed to load admin overview.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Platform-wide metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} metric={`$${(overview.mrr / 100).toFixed(0)}`} label="MRR" />
        <StatCard icon={TrendingUp} metric={`$${(overview.arr / 100).toFixed(0)}`} label="ARR" />
        <StatCard icon={Users} metric={overview.totalUsers} label="Total Users" />
        <StatCard icon={Smartphone} metric={overview.connectedDevices} label="Connected Devices" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        <div className="rounded-xl border p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
          <h2 className="text-sm font-semibold text-text-primary">Plan Breakdown</h2>
          {Object.entries(overview.planBreakdown).map(([plan, count]) => (
            <div key={plan} className="flex items-center justify-between">
              <span className="text-sm capitalize text-text-secondary">{plan}</span>
              <span className="text-sm font-semibold text-text-primary">{count} users</span>
            </div>
          ))}
        </div>

        {/* Recent spam alerts */}
        <div className="rounded-xl border p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Recent Spam Alerts</h2>
            <a href="/admin/spam" className="text-xs text-danger hover:text-danger/80">View all</a>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No alerts</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                  <span className="text-xs text-text-secondary font-mono">{alert.type}</span>
                </div>
                <span className="text-xs text-text-muted">{new Date(alert.createdAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
