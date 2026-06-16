'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { API_URL } from '../../../lib/config'

interface Alert {
  id: string
  userId: string
  deviceId: string
  type: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  RATE_LIMIT_HIT: 'text-warning',
  CAMPAIGN_PAUSED_LOW_HEALTH: 'text-danger',
}

export default function AdminSpamPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(() => {
    const t = localStorage.getItem('wc_token')
    if (!t) router.push('/login')
    return t
  }, [router])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    void fetch(`${API_URL}/admin/spam-alerts?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data: Alert[] }) => {
        setAlerts(json.data ?? [])
        setLoading(false)
      })
  }, [getToken])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Spam Alerts</h1>
        <p className="text-sm text-text-secondary mt-1">{alerts.length} alerts</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertTriangle className="w-8 h-8 text-primary mb-3" />
          <p className="text-sm text-text-secondary">No spam alerts. All clear!</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1E2D45' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr className="text-left text-xs text-text-muted border-b" style={{ borderColor: '#1E2D45' }}>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Device ID</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b last:border-0" style={{ borderColor: '#1E2D45' }}>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium font-mono ${TYPE_COLORS[alert.type] ?? 'text-text-muted'}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {alert.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted font-mono">{alert.userId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-xs text-text-muted font-mono">{alert.deviceId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(alert.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
