'use client'

import { API_URL } from '../../../lib/config'
import { useEffect, useState } from 'react'

const API = API_URL

interface ApiKey {
  id: string
  name: string
  prefix: string
  lastUsedAt: string | null
  createdAt: string
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wz_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)

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
    const res = await fetch(`${API}/v1/api-keys`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: newKeyName }),
    })
    const json = await res.json() as { data: ApiKey & { key: string } }
    setCreating(false)
    setNewKeyName('')
    if (json.data) {
      setNewKeyValue(json.data.key)
      void fetchKeys()
    }
  }

  async function revokeKey(id: string) {
    await fetch(`${API}/v1/api-keys/${id}`, { method: 'DELETE', headers: authHeaders() })
    setKeys((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Key name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : '+ Create key'}
          </button>
        </div>
      </div>

      {newKeyValue && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
          <p className="text-sm font-medium mb-2 text-yellow-800">Save this key — it will not be shown again:</p>
          <code className="text-sm font-mono bg-white border rounded px-2 py-1 block break-all">{newKeyValue}</code>
          <button onClick={() => setNewKeyValue(null)} className="mt-2 text-xs text-yellow-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-gray-500">No API keys yet.</p>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium">{k.name}</p>
                <p className="text-sm text-gray-500 font-mono">{k.prefix}••••••••••••</p>
              </div>
              <p className="text-xs text-gray-400">
                {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : 'Never used'}
              </p>
              <button
                onClick={() => revokeKey(k.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
