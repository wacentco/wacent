'use client'

import { API_URL } from '../../../lib/config'
import { useEffect, useState } from 'react'
import type { Campaign } from '@wacent/types'
import type { Device } from '@wacent/types'

const API = API_URL

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wz_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-800',
  paused: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

interface CreateForm {
  deviceId: string
  name: string
  content: string
  delayMs: number
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [recipientsModal, setRecipientsModal] = useState<string | null>(null)
  const [recipientsText, setRecipientsText] = useState('')
  const [recipientsTab, setRecipientsTab] = useState<'manual' | 'list'>('manual')
  const [contactLists, setContactLists] = useState<{ id: string; name: string; contactCount: number }[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [addingFromList, setAddingFromList] = useState(false)
  const [form, setForm] = useState<CreateForm>({ deviceId: '', name: '', content: '', delayMs: 1500 })

  async function fetchCampaigns() {
    const res = await fetch(`${API}/v1/campaigns`, { headers: authHeaders() })
    const json = await res.json() as { data: Campaign[] }
    setCampaigns(json.data ?? [])
    setLoading(false)
  }

  async function fetchDevices() {
    const res = await fetch(`${API}/v1/devices`, { headers: authHeaders() })
    const json = await res.json() as { data: Device[] }
    setDevices(json.data ?? [])
  }

  async function fetchContactLists() {
    const res = await fetch(`${API}/v1/contact-lists`, { headers: authHeaders() })
    const json = await res.json() as { data: { id: string; name: string; contactCount: number }[] }
    setContactLists(json.data ?? [])
  }

  useEffect(() => {
    void fetchCampaigns()
    void fetchDevices()
    void fetchContactLists()
  }, [])

  async function createCampaign() {
    if (!form.deviceId || !form.name || !form.content) return
    setCreating(true)
    await fetch(`${API}/v1/campaigns`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ deviceId: form.deviceId, name: form.name, content: form.content, delayMs: form.delayMs }),
    })
    setCreating(false)
    setShowCreate(false)
    setForm({ deviceId: '', name: '', content: '', delayMs: 1500 })
    void fetchCampaigns()
  }

  async function startCampaign(id: string) {
    await fetch(`${API}/v1/campaigns/${id}/start`, { method: 'POST', headers: authHeaders() })
    void fetchCampaigns()
  }

  async function pauseCampaign(id: string) {
    await fetch(`${API}/v1/campaigns/${id}/pause`, { method: 'POST', headers: authHeaders() })
    void fetchCampaigns()
  }

  async function deleteCampaign(id: string) {
    await fetch(`${API}/v1/campaigns/${id}`, { method: 'DELETE', headers: authHeaders() })
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  async function addRecipients(id: string) {
    const phones = recipientsText
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (!phones.length) return
    await fetch(`${API}/v1/campaigns/${id}/recipients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ phoneNumbers: phones }),
    })
    setRecipientsModal(null)
    setRecipientsText('')
    void fetchCampaigns()
  }

  async function addRecipientsFromList(campaignId: string) {
    if (!selectedListId) return
    setAddingFromList(true)
    const res = await fetch(`${API}/v1/contact-lists/${selectedListId}/phones`, { headers: authHeaders() })
    const json = await res.json() as { data: string[] }
    const phones = (json.data ?? []).filter(Boolean)
    if (phones.length) {
      await fetch(`${API}/v1/campaigns/${campaignId}/recipients`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phoneNumbers: phones }),
      })
    }
    setAddingFromList(false)
    setRecipientsModal(null)
    setSelectedListId('')
    void fetchCampaigns()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          + New campaign
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-gray-500">No campaigns yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{c.content ?? `[${c.messageType}]`}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>{c.recipientCount} recipients</span>
                    <span>{c.sentCount} sent</span>
                    <span>{c.deliveredCount} delivered</span>
                    {c.failedCount > 0 && <span className="text-red-500">{c.failedCount} failed</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(c.status === 'draft' || c.status === 'paused') && (
                    <button
                      onClick={() => setRecipientsModal(c.id)}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      + Recipients
                    </button>
                  )}
                  {(c.status === 'draft' || c.status === 'paused') && (
                    <button
                      onClick={() => startCampaign(c.id)}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                    >
                      Start
                    </button>
                  )}
                  {c.status === 'sending' && (
                    <button
                      onClick={() => pauseCampaign(c.id)}
                      className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600"
                    >
                      Pause
                    </button>
                  )}
                  {(c.status === 'draft' || c.status === 'completed' || c.status === 'failed') && (
                    <button
                      onClick={() => deleteCampaign(c.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">New Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Campaign name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
                <select
                  value={form.deviceId}
                  onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a device</option>
                  {devices.filter((d) => d.status === 'connected').map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message content</label>
                <textarea
                  rows={4}
                  placeholder="Your message…"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay between messages (ms)</label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={form.delayMs}
                  onChange={(e) => setForm((f) => ({ ...f, delayMs: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={createCampaign}
                disabled={creating || !form.name || !form.deviceId || !form.content}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {recipientsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-3">Add Recipients</h2>

            {/* Tab selector */}
            <div className="flex border-b mb-4">
              {(['manual', 'list'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRecipientsTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    recipientsTab === tab
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'manual' ? 'Manual' : 'From Contact List'}
                </button>
              ))}
            </div>

            {recipientsTab === 'manual' ? (
              <>
                <p className="text-sm text-gray-500 mb-3">Enter phone numbers in E.164 format, one per line or comma-separated.</p>
                <textarea
                  rows={8}
                  placeholder="+628123456789&#10;+628987654321"
                  value={recipientsText}
                  onChange={(e) => setRecipientsText(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none"
                />
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => { setRecipientsModal(null); setRecipientsText('') }} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                  <button
                    onClick={() => addRecipients(recipientsModal)}
                    disabled={!recipientsText.trim()}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">All contacts in the selected list will be added as recipients.</p>
                {contactLists.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No contact lists yet. <a href="/contacts/lists" className="text-green-600 hover:underline">Create one →</a></p>
                ) : (
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select a list…</option>
                    {contactLists.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.contactCount} contacts)</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => { setRecipientsModal(null); setSelectedListId('') }} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                  <button
                    onClick={() => addRecipientsFromList(recipientsModal)}
                    disabled={!selectedListId || addingFromList}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {addingFromList ? 'Adding…' : 'Add from list'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
