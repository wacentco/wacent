'use client'

import { API_URL } from '../../../lib/config'
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { Webhook } from '@wacent/types'

const API = API_URL

const ALL_EVENTS = [
  'message.sent',
  'message.delivered',
  'message.read',
  'message.failed',
  'message.received',
  'device.connected',
  'device.disconnected',
  'device.qr_updated',
] as const

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wc_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; status: number | null; ok: boolean } | null>(null)
  const [form, setForm] = useState({ url: '', secret: '', events: [] as string[] })

  async function fetchWebhooks() {
    const res = await fetch(`${API}/v1/webhooks`, { headers: authHeaders() })
    const json = await res.json() as { data: Webhook[] }
    setWebhooks(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { void fetchWebhooks() }, [])

  function toggleEvent(event: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }))
  }

  async function createWebhook() {
    if (!form.url || !form.secret || form.events.length === 0) return
    setCreating(true)
    try {
      await fetch(`${API}/v1/webhooks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ url: form.url, secret: form.secret, events: form.events }),
      })
      setShowCreate(false)
      setForm({ url: '', secret: '', events: [] })
      void fetchWebhooks()
    } finally {
      setCreating(false)
    }
  }

  async function deleteWebhook(id: string) {
    setDeletingId(id)
    try {
      await fetch(`${API}/v1/webhooks/${id}`, { method: 'DELETE', headers: authHeaders() })
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function testWebhook(id: string) {
    setTestingId(id)
    try {
      const res = await fetch(`${API}/v1/webhooks/${id}/test`, { method: 'POST', headers: authHeaders() })
      const json = await res.json() as { data: { status: number | null } }
      const status = json.data?.status
      setTestResult({ id, status: status ?? null, ok: typeof status === 'number' && status < 400 })
      setTimeout(() => setTestResult(null), 4000)
    } finally {
      setTestingId(null)
    }
  }

  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Webhooks</h1>
          <p className="text-sm text-text-secondary mt-1">Receive real-time events via HTTP POST</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          + Add webhook
        </button>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${testResult.ok ? 'text-primary' : 'text-danger'}`}
          style={{ background: testResult.ok ? 'rgba(0,214,143,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.ok ? 'rgba(0,214,143,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {testResult.ok
            ? <><CheckCircle2 className="w-4 h-4" /> Test delivered — HTTP {testResult.status ?? '?'}</>
            : <><XCircle className="w-4 h-4" /> Test failed — HTTP {testResult.status ?? 'no response'}</>}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : webhooks.length === 0 ? (
        <p className="text-text-secondary text-sm">No webhooks configured yet.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className="rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-text-primary truncate">{w.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(w.events as string[]).map((e) => (
                      <span key={e} className="text-xs text-text-secondary px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>{e}</span>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-text-muted">
                    <span className={w.isActive ? 'text-primary' : 'text-danger'}>{w.isActive ? 'Active' : 'Disabled'}</span>
                    {w.failureCount > 0 && <span className="text-danger">{w.failureCount} failures</span>}
                    {w.lastTriggeredAt && <span>Last triggered {new Date(w.lastTriggeredAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => void testWebhook(w.id)}
                    disabled={testingId === w.id}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary disabled:opacity-50 transition-colors"
                    style={{ cursor: testingId === w.id ? 'not-allowed' : 'pointer' }}
                  >
                    {testingId === w.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Testing…</> : 'Test'}
                  </button>
                  <button
                    onClick={() => void deleteWebhook(w.id)}
                    disabled={deletingId === w.id}
                    className="flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 disabled:opacity-50 transition-colors"
                    style={{ cursor: deletingId === w.id ? 'not-allowed' : 'pointer' }}
                  >
                    {deletingId === w.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Deleting…</> : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="relative rounded-xl border p-6 w-full max-w-lg" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <h2 className="text-lg font-bold text-text-primary mb-4">Add Webhook</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Endpoint URL</label>
                <input type="url" placeholder="https://your-server.com/webhook" value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Secret (min 16 chars)</label>
                <input type="text" placeholder="your-webhook-secret" value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Events to subscribe</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.events.includes(event)} onChange={() => toggleEvent(event)} className="rounded accent-primary" />
                      <span className="text-xs text-text-secondary">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button
                onClick={createWebhook}
                disabled={creating || !form.url || !form.secret || form.events.length === 0}
                className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                style={{ cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : 'Add webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
