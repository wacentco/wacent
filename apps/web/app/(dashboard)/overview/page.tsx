'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Smartphone, CheckCircle, Megaphone, Send, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StatCard } from '../../../components/ui/StatCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { API_URL } from '../../../lib/config'

interface DeviceRow {
  id: string
  name: string
  phoneNumber: string | null
  status: string
}

interface MessageRow {
  id: string
  toNumber: string | null
  type: string
  status: string
  createdAt: string
}

export default function OverviewPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('wc_token')
    if (!token) { router.push('/login'); return }

    async function load() {
      const headers = { Authorization: `Bearer ${token}` }
      const [devRes, msgRes] = await Promise.all([
        fetch(`${API_URL}/v1/devices`, { headers }),
        fetch(`${API_URL}/v1/messages?limit=5`, { headers }),
      ])
      if (!devRes.ok) { router.push('/login'); return }
      const devJson = await devRes.json() as { data: DeviceRow[] }
      const msgJson = await msgRes.json() as { data: MessageRow[] }
      setDevices(devJson.data ?? [])
      setMessages(msgJson.data ?? [])
      setLoading(false)
    }

    void load()
  }, [router])

  const connected = devices.filter((d) => d.status === 'connected').length
  const delivered = messages.filter((m) => m.status === 'delivered' || m.status === 'read').length
  const deliveryRate = messages.length > 0 ? Math.round((delivered / messages.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Your platform at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} metric={messages.length} label="Total Messages" />
        <StatCard icon={Smartphone} metric={connected} label="Connected Devices" />
        <StatCard icon={CheckCircle} metric={`${deliveryRate}%`} label="Delivery Rate" />
        <StatCard icon={Megaphone} metric={0} label="Active Campaigns" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="rounded-xl border p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
          <h2 className="text-sm font-semibold text-text-primary">Quick Actions</h2>
          <button
            onClick={() => router.push('/messages')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Send className="w-4 h-4" /> Send Message
          </button>
          <button
            onClick={() => router.push('/devices')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Device
          </button>
          <button
            onClick={() => router.push('/campaigns')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Megaphone className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {/* Device status */}
        <div className="lg:col-span-2 rounded-xl border p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
          <h2 className="text-sm font-semibold text-text-primary">Devices</h2>
          {devices.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">No devices yet</p>
          ) : (
            <div className="space-y-2">
              {devices.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm text-text-primary font-medium">{d.name}</p>
                    <p className="text-xs text-text-muted">{d.phoneNumber ?? '—'}</p>
                  </div>
                  <StatusBadge status={d.status as 'connected' | 'connecting' | 'disconnected' | 'banned'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent messages */}
      <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
        <h2 className="text-sm font-semibold text-text-primary mb-4">Recent Messages</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">No messages yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b" style={{ borderColor: '#1E2D45' }}>
                  <th className="pb-2">To</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {messages.map((m) => (
                  <tr key={m.id} className="border-b last:border-0" style={{ borderColor: '#1E2D45' }}>
                    <td className="py-2 text-text-primary">{m.toNumber ?? '—'}</td>
                    <td className="py-2 text-text-secondary capitalize">{m.type}</td>
                    <td className="py-2">
                      <span className={`capitalize text-xs font-medium ${
                        m.status === 'delivered' || m.status === 'read' ? 'text-primary' :
                        m.status === 'failed' ? 'text-danger' : 'text-text-muted'
                      }`}>{m.status}</span>
                    </td>
                    <td className="py-2 text-text-muted text-xs">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
