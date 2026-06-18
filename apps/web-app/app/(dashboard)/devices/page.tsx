'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Smartphone, Trash2, WifiOff, QrCode, X, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { HealthBar } from '../../../components/ui/HealthBar'
import { EmptyState } from '../../../components/ui/EmptyState'
import { API_URL } from '../../../lib/config'
import { authHeaders, getToken } from '../../../lib/auth'

interface Device {
  id: string
  name: string
  phoneNumber: string | null
  status: string
  healthScore: number
  autoWarm: boolean
  warmProgress: number
}

const STATUS_TOOLTIPS: Record<string, string> = {
  connected: 'Your WhatsApp number is active and ready to send/receive messages.',
  connecting: 'Setting up your WhatsApp connection. Click Connect to scan the QR code.',
  disconnected: 'This number is paused. Click Connect to resume without scanning a new QR code.',
  banned: 'This number has been banned by WhatsApp. You will need to use a different number.',
}

function Tooltip({ text, children, className }: { text: string; children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 3000)
  }

  const hide = () => {
    setVisible(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return (
    <div
      className={`relative ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={show}
    >
      {children}
      {visible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-[90vw] rounded-lg border border-white/10 bg-gray-900 p-3 text-center text-xs text-text-secondary shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/10" />
        </div>
      )}
    </div>
  )
}

export default function DevicesPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [qrModal, setQrModal] = useState<{ deviceId: string; name: string } | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteModal, setDeleteModal] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    const token = getToken()
    if (!token) { router.push('/login'); return }
    const res = await fetch(`${API_URL}/v1/devices`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) { router.push('/login'); return }
    const json = await res.json() as { data: Device[] }
    setDevices(json.data ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { void loadDevices() }, [loadDevices])

  async function createDevice() {
    if (!newName.trim()) return
    const token = getToken()
    if (!token) return
    setCreating(true)
    const res = await fetch(`${API_URL}/v1/devices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setCreating(false)
    if (res.ok) { setNewName(''); void loadDevices() }
  }

  async function openQR(device: Device) {
    setQrCode(null)
    setQrModal({ deviceId: device.id, name: device.name })
    const token = getToken()
    if (!token) return

    await fetch(`${API_URL}/v1/devices/${device.id}/reconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    const poll = setInterval(async () => {
      const res = await fetch(`${API_URL}/v1/devices/${device.id}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json() as { data: { qrCode: string | null; status: string } }
        if (json.data?.status === 'connected') {
          clearInterval(poll)
          setQrModal(null)
          setQrCode(null)
          void loadDevices()
        } else if (json.data?.qrCode) {
          setQrCode(json.data.qrCode)
        }
      }
    }, 3000)

    setTimeout(() => clearInterval(poll), 300_000)
  }

  async function confirmDelete() {
    if (!deleteModal) return
    const token = getToken()
    if (!token) return
    await fetch(`${API_URL}/v1/devices/${deleteModal}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDeleteModal(null)
    void loadDevices()
  }

  async function disconnectDevice(id: string) {
    const token = getToken()
    if (!token) return
    await fetch(`${API_URL}/v1/devices/${id}/disconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    void loadDevices()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Devices</h1>
          <p className="text-sm text-text-secondary mt-1">{devices.length} WhatsApp number{devices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void createDevice() }}
            placeholder="Device name…"
            className="flex-1 sm:flex-none sm:w-44 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={() => void createDevice()}
            disabled={creating || !newName.trim()}
            className="whitespace-nowrap px-4 py-2 rounded-lg bg-primary text-background text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {creating ? '…' : 'Add Device'}
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="No devices yet"
          description="Connect your first WhatsApp number to start sending messages."
          action={{ label: 'Add Device', onClick: () => { const el = document.querySelector('input'); el?.focus() } }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="rounded-xl border p-5 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{device.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{device.phoneNumber ?? 'No number yet'}</p>
                </div>
                <Tooltip text={STATUS_TOOLTIPS[device.status] ?? ''}>
                  <StatusBadge status={device.status as 'connected' | 'connecting' | 'disconnected' | 'banned'} />
                </Tooltip>
              </div>

              <HealthBar score={device.healthScore ?? 100} />

              {device.autoWarm && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>Auto Warmer</span>
                    <span>{device.warmProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
                    <div
                      className="h-full rounded-full bg-warning transition-all"
                      style={{ width: `${device.warmProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-auto pt-1">
                {device.status !== 'connected' ? (
                  <Tooltip className="flex-1" text="Connect your WhatsApp number by scanning a QR code. If previously connected, this will reconnect without scanning again.">
                    <button
                      onClick={() => void openQR(device)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Connect
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip className="flex-1" text="Temporarily pause this WhatsApp connection. Your session is saved — reconnect anytime without scanning a new QR code. Note: if you log out from WhatsApp on your phone, you will need to scan a new QR code.">
                    <button
                      onClick={() => void disconnectDevice(device.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary border border-border hover:border-warning hover:text-warning transition-colors"
                    >
                      <WifiOff className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Permanently delete this device and all its message history.">
                  <button
                    onClick={() => setDeleteModal(device.id)}
                    className="flex items-center justify-center px-2.5 py-1.5 rounded-lg text-danger/70 border border-border hover:border-danger hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Need help?{' '}
        <a href="/best-practices" className="text-primary hover:underline">
          Read our Best Practices guide →
        </a>
      </p>

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <h2 className="text-base font-semibold text-text-primary">Delete this device?</h2>
            </div>
            <p className="text-sm text-text-secondary mb-2">
              This will permanently remove this WhatsApp number and all its message history from Wacent.
              You will need to scan a new QR code to reconnect this number in the future.
            </p>
            <p className="text-sm font-medium text-text-primary mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-text-secondary border border-border hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirmDelete()}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-danger hover:bg-danger/80 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-primary">Connect {qrModal.name}</h2>
              <button onClick={() => { setQrModal(null); setQrCode(null) }} className="text-text-muted hover:text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-4">Open WhatsApp → Linked Devices → Link a Device, then scan this QR.</p>
            <div className="flex items-center justify-center bg-surface-raised rounded-xl p-4 mb-3">
              {qrCode ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-text-muted text-center">Refreshes every 30 seconds</p>
          </div>
        </div>
      )}
    </div>
  )
}
