'use client'

import { useEffect, useState } from 'react'
import type { Webhook } from '@wazap/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('wz_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
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
    await fetch(`${API}/v1/webhooks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url: form.url, secret: form.secret, events: form.events }),
    })
    setCreating(false)
    setShowCreate(false)
    setForm({ url: '', secret: '', events: [] })
    void fetchWebhooks()
  }

  async function deleteWebhook(id: string) {
    await fetch(`${API}/v1/webhooks/${id}`, { method: 'DELETE', headers: authHeaders() })
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
  }

  async function testWebhook(id: string) {
    const res = await fetch(`${API}/v1/webhooks/${id}/test`, { method: 'POST', headers: authHeaders() })
    const json = await res.json() as { data: { status: number | null } }
    const status = json.data?.status
    setTestResult({ id, status: status ?? null, ok: typeof status === 'number' && status < 400 })
    setTimeout(() => setTestResult(null), 4000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-gray-500 mt-0.5">Receive real-time events via HTTP POST</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          + Add webhook
        </button>
      </div>

      {testResult && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${testResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {testResult.ok ? `Test delivered — HTTP ${testResult.status ?? '?'}` : `Test failed — HTTP ${testResult.status ?? 'no response'}`}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : webhooks.length === 0 ? (
        <p className="text-gray-500">No webhooks configured yet.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium truncate">{w.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(w.events as string[]).map((e) => (
                      <span key={e} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{e}</span>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span className={w.isActive ? 'text-green-600' : 'text-red-500'}>{w.isActive ? 'Active' : 'Disabled'}</span>
                    {w.failureCount > 0 && <span className="text-red-500">{w.failureCount} failures</span>}
                    {w.lastTriggeredAt && <span>Last triggered {new Date(w.lastTriggeredAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => testWebhook(w.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => deleteWebhook(w.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">Add Webhook</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret (min 16 chars)</label>
                <input
                  type="text"
                  placeholder="your-webhook-secret"
                  value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Events to subscribe</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-700">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={createWebhook}
                disabled={creating || !form.url || !form.secret || form.events.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Adding…' : 'Add webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
