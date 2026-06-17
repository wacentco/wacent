'use client'

import { API_URL } from '../../../lib/config'
import { authHeaders } from '../../../lib/auth'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Campaign, Device } from '@wacent/types'

const API = API_URL

const statusColor: Record<string, string> = {
  draft:     'text-text-muted',
  scheduled: 'text-accent',
  sending:   'text-warning',
  paused:    'text-warning',
  completed: 'text-primary',
  failed:    'text-danger',
}
const statusBg: Record<string, string> = {
  draft:     'rgba(255,255,255,0.05)',
  scheduled: 'rgba(99,102,241,0.12)',
  sending:   'rgba(245,158,11,0.12)',
  paused:    'rgba(245,158,11,0.12)',
  completed: 'rgba(0,214,143,0.12)',
  failed:    'rgba(239,68,68,0.12)',
}

interface CreateForm {
  deviceId: string
  name: string
  content: string
  delayMs: number
}

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [pausingId, setPausingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addingRecipients, setAddingRecipients] = useState(false)
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
    try {
      await fetch(`${API}/v1/campaigns`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ deviceId: form.deviceId, name: form.name, content: form.content, delayMs: form.delayMs }),
      })
      setShowCreate(false)
      setForm({ deviceId: '', name: '', content: '', delayMs: 1500 })
      void fetchCampaigns()
    } finally {
      setCreating(false)
    }
  }

  async function startCampaign(id: string) {
    setStartingId(id)
    try {
      await fetch(`${API}/v1/campaigns/${id}/start`, { method: 'POST', headers: authHeaders() })
      void fetchCampaigns()
    } finally {
      setStartingId(null)
    }
  }

  async function pauseCampaign(id: string) {
    setPausingId(id)
    try {
      await fetch(`${API}/v1/campaigns/${id}/pause`, { method: 'POST', headers: authHeaders() })
      void fetchCampaigns()
    } finally {
      setPausingId(null)
    }
  }

  async function deleteCampaign(id: string) {
    setDeletingId(id)
    try {
      await fetch(`${API}/v1/campaigns/${id}`, { method: 'DELETE', headers: authHeaders() })
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function addRecipients(id: string) {
    const phones = recipientsText.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean)
    if (!phones.length) return
    setAddingRecipients(true)
    try {
      await fetch(`${API}/v1/campaigns/${id}/recipients`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phoneNumbers: phones }),
      })
      setRecipientsModal(null)
      setRecipientsText('')
      void fetchCampaigns()
    } finally {
      setAddingRecipients(false)
    }
  }

  async function addRecipientsFromList(campaignId: string) {
    if (!selectedListId) return
    setAddingFromList(true)
    try {
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
      setRecipientsModal(null)
      setSelectedListId('')
      void fetchCampaigns()
    } finally {
      setAddingFromList(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Campaigns</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          + New campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <p className="text-text-secondary text-sm">No campaigns yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-text-primary truncate">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[c.status] ?? 'text-text-muted'}`}
                      style={{ background: statusBg[c.status] ?? 'rgba(255,255,255,0.05)' }}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary truncate">{c.content ?? `[${c.messageType}]`}</p>
                  <div className="flex gap-4 mt-2 text-xs text-text-muted">
                    <span>{c.recipientCount} recipients</span>
                    <span>{c.sentCount} sent</span>
                    <span>{c.deliveredCount} delivered</span>
                    {c.failedCount > 0 && <span className="text-danger">{c.failedCount} failed</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(c.status === 'draft' || c.status === 'paused') && (
                    <button onClick={() => setRecipientsModal(c.id)}
                      className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                      + Recipients
                    </button>
                  )}
                  {(c.status === 'draft' || c.status === 'paused') && (
                    <button
                      onClick={() => void startCampaign(c.id)}
                      disabled={startingId === c.id}
                      className="flex items-center gap-1.5 text-xs bg-primary text-background px-3 py-1 rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
                      style={{ cursor: startingId === c.id ? 'not-allowed' : 'pointer' }}
                    >
                      {startingId === c.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Startingâ€¦</> : 'Start'}
                    </button>
                  )}
                  {c.status === 'sending' && (
                    <button
                      onClick={() => void pauseCampaign(c.id)}
                      disabled={pausingId === c.id}
                      className="flex items-center gap-1.5 text-xs text-warning border border-warning/40 px-3 py-1 rounded-lg hover:bg-warning/10 disabled:opacity-50 transition-colors"
                      style={{ cursor: pausingId === c.id ? 'not-allowed' : 'pointer' }}
                    >
                      {pausingId === c.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Pausingâ€¦</> : 'Pause'}
                    </button>
                  )}
                  {(c.status === 'draft' || c.status === 'completed' || c.status === 'failed') && (
                    <button
                      onClick={() => void deleteCampaign(c.id)}
                      disabled={deletingId === c.id}
                      className="flex items-center gap-1.5 text-xs text-danger hover:text-danger/80 disabled:opacity-50 transition-colors"
                      style={{ cursor: deletingId === c.id ? 'not-allowed' : 'pointer' }}
                    >
                      {deletingId === c.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Deletingâ€¦</> : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl border p-6 w-full max-w-md" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <h2 className="text-lg font-bold text-text-primary mb-4">New Campaign</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                <input type="text" placeholder="Campaign name" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Device</label>
                <select value={form.deviceId} onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                  className={inputCls}>
                  <option value="">Select a device</option>
                  {devices.filter((d) => d.status === 'connected').map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Message content</label>
                <textarea rows={4} placeholder="Your messageâ€¦" value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Delay between messages (ms)</label>
                <input type="number" min={1000} step={500} value={form.delayMs}
                  onChange={(e) => setForm((f) => ({ ...f, delayMs: Number(e.target.value) }))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button
                onClick={createCampaign}
                disabled={creating || !form.name || !form.deviceId || !form.content}
                className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                style={{ cursor: creating ? 'not-allowed' : 'pointer' }}
              >
                {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creatingâ€¦</> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {recipientsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl border p-6 w-full max-w-md" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <h2 className="text-lg font-bold text-text-primary mb-3">Add Recipients</h2>

            <div className="flex border-b mb-4" style={{ borderColor: '#1E2D45' }}>
              {(['manual', 'list'] as const).map((tab) => (
                <button key={tab} onClick={() => setRecipientsTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    recipientsTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}>
                  {tab === 'manual' ? 'Manual' : 'From Contact List'}
                </button>
              ))}
            </div>

            {recipientsTab === 'manual' ? (
              <>
                <p className="text-sm text-text-secondary mb-3">Enter phone numbers in E.164 format, one per line or comma-separated.</p>
                <textarea rows={8} placeholder={'+628123456789\n+628987654321'} value={recipientsText}
                  onChange={(e) => setRecipientsText(e.target.value)}
                  className={`${inputCls} font-mono resize-none`} />
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => { setRecipientsModal(null); setRecipientsText('') }}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                  <button
                    onClick={() => void addRecipients(recipientsModal)}
                    disabled={!recipientsText.trim() || addingRecipients}
                    className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                    style={{ cursor: addingRecipients ? 'not-allowed' : 'pointer' }}
                  >
                    {addingRecipients ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Addingâ€¦</> : 'Add'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary mb-3">All contacts in the selected list will be added as recipients.</p>
                {contactLists.length === 0 ? (
                  <p className="text-sm text-text-muted py-4 text-center">No contact lists yet. <a href="/contacts/lists" className="text-primary hover:underline">Create one â†’</a></p>
                ) : (
                  <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)} className={inputCls}>
                    <option value="">Select a listâ€¦</option>
                    {contactLists.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.contactCount} contacts)</option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => { setRecipientsModal(null); setSelectedListId('') }}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                  <button
                    onClick={() => void addRecipientsFromList(recipientsModal)}
                    disabled={!selectedListId || addingFromList}
                    className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                    style={{ cursor: addingFromList ? 'not-allowed' : 'pointer' }}
                  >
                    {addingFromList ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Addingâ€¦</> : 'Add from list'}
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
