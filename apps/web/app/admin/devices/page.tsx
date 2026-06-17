'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { HealthBar } from '../../../components/ui/HealthBar'
import { API_URL } from '../../../lib/config'
import { authHeaders, getToken } from '../../../lib/auth'

interface DeviceRow {
  id: string
  name: string
  phoneNumber: string | null
  status: string
  healthScore: number
  userId: string
  createdAt: string
}

function maskPhone(phone: string | null) {
  if (!phone) return 'â€”'
  if (phone.length < 8) return phone
  return phone.slice(0, 5) + '****' + phone.slice(-3)
}

export default function AdminDevicesPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.push('/login'); return }
    void fetch(`${API_URL}/admin/devices?limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data: DeviceRow[] }) => {
        setDevices(json.data ?? [])
        setLoading(false)
      })
  }, [router])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Device Monitor</h1>
        <p className="text-sm text-text-secondary mt-1">{devices.length} devices on platform</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1E2D45' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr className="text-left text-xs text-text-muted border-b" style={{ borderColor: '#1E2D45' }}>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-48">Health</th>
                <th className="px-4 py-3">Added</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b last:border-0" style={{ borderColor: '#1E2D45' }}>
                  <td className="px-4 py-3 text-text-primary font-medium">{device.name}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{maskPhone(device.phoneNumber)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={device.status as 'connected' | 'connecting' | 'disconnected' | 'banned'} />
                  </td>
                  <td className="px-4 py-3">
                    <HealthBar score={device.healthScore ?? 100} label={false} />
                    <span className="text-xs text-text-muted">{device.healthScore ?? 100}%</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(device.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
