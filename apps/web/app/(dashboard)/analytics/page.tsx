'use client'

import { API_URL } from '../../../lib/config'
import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts'

const API = API_URL

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wz_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

interface Overview {
  sent: number
  delivered: number
  read: number
  failed: number
  received: number
  deliveryRate: number
  readRate: number
  totalDevices: number
  activeDevices: number
  periodDays: number
}

interface VolumeRow {
  date: string
  sent: number
  delivered: number
  read: number
  failed: number
  received: number
}

interface DeviceRow {
  deviceId: string
  deviceName: string
  phoneNumber: string | null
  status: string
  sent: number
  delivered: number
  failed: number
  received: number
}

const DAYS_OPTIONS = [7, 14, 30, 60, 90]

const statusColor: Record<string, string> = {
  connected: 'bg-green-100 text-green-800',
  disconnected: 'bg-gray-100 text-gray-700',
  connecting: 'bg-yellow-100 text-yellow-800',
  banned: 'bg-red-100 text-red-800',
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [volume, setVolume] = useState<VolumeRow[]>([])
  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void Promise.all([
      fetch(`${API}/v1/analytics/overview?days=${days}`, { headers: authHeaders() })
        .then((r) => r.json() as Promise<{ data: Overview }>)
        .then((j) => setOverview(j.data)),
      fetch(`${API}/v1/analytics/messages?days=${days}`, { headers: authHeaders() })
        .then((r) => r.json() as Promise<{ data: VolumeRow[] }>)
        .then((j) => setVolume(j.data ?? [])),
      fetch(`${API}/v1/analytics/devices`, { headers: authHeaders() })
        .then((r) => r.json() as Promise<{ data: DeviceRow[] }>)
        .then((j) => setDeviceRows(j.data ?? [])),
    ]).then(() => setLoading(false))
  }, [days])

  const statCards = overview
    ? [
        { label: 'Messages Sent', value: overview.sent.toLocaleString(), sub: `last ${overview.periodDays}d` },
        { label: 'Delivery Rate', value: `${overview.deliveryRate}%`, sub: `${overview.delivered.toLocaleString()} delivered` },
        { label: 'Read Rate', value: `${overview.readRate}%`, sub: `${overview.read.toLocaleString()} read` },
        { label: 'Failed', value: overview.failed.toLocaleString(), sub: 'permanent failures', danger: overview.failed > 0 },
        { label: 'Received', value: overview.received.toLocaleString(), sub: 'inbound messages' },
        { label: 'Active Devices', value: `${overview.activeDevices} / ${overview.totalDevices}`, sub: 'connected now' },
      ]
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Last</span>
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
                days === d
                  ? 'bg-green-600 text-white'
                  : 'border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.danger ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Volume over time */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="text-base font-semibold mb-4">Message Volume</h2>
            {volume.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={volume} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v)
                      return `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" name="Sent" stroke="#16a34a" fill="url(#gSent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#3b82f6" fill="url(#gDelivered)" strokeWidth={2} />
                  <Area type="monotone" dataKey="read" name="Read" stroke="#a855f7" fill="url(#gRead)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per-device breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-base font-semibold mb-4">Per-Device Volume (30d)</h2>
              {deviceRows.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-12">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deviceRows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="deviceName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="sent" name="Sent" fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="delivered" name="Delivered" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Device table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="text-base font-semibold">Device Breakdown</h2>
              </div>
              {deviceRows.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-12">No device data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Device</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Sent</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Delivered</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Failed</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deviceRows.map((d) => (
                      <tr key={d.deviceId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{d.deviceName}</p>
                          <p className="text-xs text-gray-400">{d.phoneNumber ?? 'not linked'}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{d.sent}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{d.delivered}</td>
                        <td className={`px-4 py-3 text-right font-medium ${d.failed > 0 ? 'text-red-600' : 'text-gray-400'}`}>{d.failed}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[d.status] ?? ''}`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
