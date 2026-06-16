'use client'

import { useEffect, useState } from 'react'
import type { Device } from '@wazap/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('wz_token') ?? '' : ''
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
}

// warm_progress 0–100 → estimated day 1–30
function progressToDay(p: number) {
  return Math.max(1, Math.round((p / 100) * 30))
}

function warmTooltip(d: Device): string {
  if (d.warmProgress >= 100) return 'Fully warmed ✓'
  const day = progressToDay(d.warmProgress)
  const remaining = Math.max(0, 30 - day)
  if (day <= 2) return `Day ~${day} — sending 5–10 msgs/day · ~${remaining} days left`
  if (day <= 5) return `Day ~${day} — sending 20–50 msgs/day · ~${remaining} days left`
  if (day <= 10) return `Day ~${day} — sending 100–200 msgs/day · ~${remaining} days left`
  if (day <= 14) return `Day ~${day} — sending 300–500 msgs/day · ~${remaining} days left`
  return `Day ~${day} — full volume · ~${remaining} days left`
}

const statusColor: Record<string, string> = {
  connected: 'bg-green-100 text-green-800',
  connecting: 'bg-yellow-100 text-yellow-800',
  disconnected: 'bg-gray-100 text-gray-700',
  banned: 'bg-red-100 text-red-800',
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [qrModal, setQrModal] = useState<{ deviceId: string; qr: string | null } | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  async function fetchDevices() {
    const res = await fetch(`${API}/v1/devices`, { headers: authHeaders() })
    const json = await res.json() as { data: Device[] }
    setDevices(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { void fetchDevices() }, [])

  async function addDevice() {
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch(`${API}/v1/devices`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: newName, autoWarm: false }),
    })
    const json = await res.json() as { data: Device }
    setAdding(false)
    setNewName('')
    if (json.data) {
      setDevices((prev) => [json.data!, ...prev])
      void openQR(json.data.id)
    }
  }

  async function openQR(deviceId: string) {
    setQrModal({ deviceId, qr: null })
    const poll = setInterval(async () => {
      const res = await fetch(`${API}/v1/devices/${deviceId}/qr`, { headers: authHeaders() })
      const json = await res.json() as { data: { qrCode: string | null; status: string } }
      if (json.data.status === 'connected') {
        clearInterval(poll)
        setQrModal(null)
        void fetchDevices()
        return
      }
      if (json.data.qrCode) {
        setQrModal({ deviceId, qr: json.data.qrCode })
      }
    }, 2000)
  }

  async function toggleWarm(device: Device) {
    setToggling(device.id)
    const res = await fetch(`${API}/v1/devices/${device.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ autoWarm: !device.autoWarm }),
    })
    const json = await res.json() as { data: Pick<Device, 'id' | 'autoWarm' | 'warmProgress'> }
    if (json.data) {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, autoWarm: json.data.autoWarm, warmProgress: json.data.warmProgress } : d,
        ),
      )
    }
    setToggling(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Devices</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Device name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={addDevice}
            disabled={adding || !newName.trim()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add device'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : devices.length === 0 ? (
        <p className="text-gray-500">No devices yet. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {devices.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-sm text-gray-500">{d.phoneNumber ?? 'Not linked'}</p>
                </div>

                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[d.status] ?? ''}`}>
                  {d.status}
                </span>

                {/* Auto Warmer toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Auto Warm</span>
                  <button
                    onClick={() => toggleWarm(d)}
                    disabled={toggling === d.id}
                    title={d.autoWarm ? 'Disable Auto Warmer' : 'Enable Auto Warmer'}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:opacity-50 ${
                      d.autoWarm ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
                        d.autoWarm ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {d.status !== 'connected' && (
                  <button
                    onClick={() => openQR(d.id)}
                    className="text-sm text-green-600 hover:underline"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Warm progress bar */}
              {d.autoWarm && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {d.warmProgress >= 100 ? 'Fully warmed' : `Warming — Day ~${progressToDay(d.warmProgress)} of 30`}
                    </span>
                    <span
                      className="text-xs text-gray-400 cursor-help"
                      title={warmTooltip(d)}
                    >
                      {d.warmProgress}% ⓘ
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        d.warmProgress >= 100 ? 'bg-green-500' : 'bg-yellow-400'
                      }`}
                      style={{ width: `${d.warmProgress}%` }}
                    />
                  </div>
                  {d.warmProgress < 100 && (
                    <p className="text-xs text-gray-400 mt-1">{warmTooltip(d)}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center max-w-xs w-full">
            <h2 className="text-lg font-bold mb-4">Scan QR with WhatsApp</h2>
            {qrModal.qr ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrModal.qr)}`}
                alt="QR code"
                className="mx-auto"
              />
            ) : (
              <p className="text-gray-500">Generating QR code…</p>
            )}
            <button
              onClick={() => setQrModal(null)}
              className="mt-4 text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
