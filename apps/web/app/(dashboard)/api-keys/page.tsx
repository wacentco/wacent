'use client'

import { API_URL } from '../../../lib/config'
import { authHeaders } from '../../../lib/auth'
import { useEffect, useState } from 'react'
import { Loader2, Copy, Check } from 'lucide-react'

const API = API_URL

interface ApiKey {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function fetchKeys() {
    const res = await fetch(`${API}/v1/api-keys`, { headers: authHeaders() })
    const json = await res.json() as { data: ApiKey[] }
    setKeys(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { void fetchKeys() }, [])

  async function createKey() {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${API}/v1/api-keys`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newKeyName }),
      })
      const json = await res.json() as { data: ApiKey & { key: string } }
      setNewKeyName('')
      if (json.data) {
        setNewKeyValue(json.data.key)
        void fetchKeys()
      }
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id)
    try {
      await fetch(`${API}/v1/api-keys/${id}`, { method: 'DELETE', headers: authHeaders() })
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } finally {
      setRevokingId(null)
    }
  }

  async function copyKey() {
    if (!newKeyValue) return
    await navigator.clipboard.writeText(newKeyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">API Keys</h1>
          <p className="text-sm text-text-secondary mt-1">Authenticate your API requests</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Key name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void createKey() }}
            className="flex-1 sm:flex-none sm:w-40 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="whitespace-nowrap flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            style={{ cursor: creating ? 'not-allowed' : 'pointer' }}
          >
            {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : '+ Create key'}
          </button>
        </div>
      </div>

      {newKeyValue && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(0,214,143,0.06)', borderColor: 'rgba(0,214,143,0.3)' }}>
          <p className="text-sm font-medium text-primary mb-2">Save this key â€” it will not be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-text-primary bg-surface border border-border rounded px-3 py-2 break-all">{newKeyValue}</code>
            <button onClick={copyKey} className="shrink-0 p-2 rounded-lg border border-border hover:border-primary text-text-secondary hover:text-primary transition-colors">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewKeyValue(null)} className="mt-2 text-xs text-text-muted hover:text-text-secondary">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <p className="text-text-secondary text-sm">No API keys yet. Create one to start using the API.</p>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
              <div className="flex-1">
                <p className="font-medium text-text-primary">{k.name}</p>
                <p className="text-sm text-text-muted font-mono mt-0.5">{k.prefix}â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢</p>
              </div>
              <p className="text-xs text-text-muted">
                {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used'}
              </p>
              <button
                onClick={() => void revokeKey(k.id)}
                disabled={revokingId === k.id}
                className="flex items-center gap-1.5 text-sm text-danger hover:text-danger/80 disabled:opacity-50 transition-colors"
                style={{ cursor: revokingId === k.id ? 'not-allowed' : 'pointer' }}
              >
                {revokingId === k.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Revokingâ€¦</> : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
