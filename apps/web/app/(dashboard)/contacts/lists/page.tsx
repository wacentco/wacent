'use client'

import { API_URL } from '../../../../lib/config'
import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import type { Contact } from '@wacent/types'

const API = API_URL

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wc_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

interface ContactList {
  id: string
  name: string
  contactCount: number
  createdAt: string
}

export default function ContactListsPage() {
  const [lists, setLists] = useState<ContactList[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

  const [activeList, setActiveList] = useState<ContactList | null>(null)
  const [members, setMembers] = useState<Contact[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    const res = await fetch(`${API}/v1/contact-lists`, { headers: authHeaders() })
    const json = await res.json() as { data: ContactList[] }
    setLists(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void fetchLists() }, [fetchLists])

  async function createList() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await fetch(`${API}/v1/contact-lists`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: newName }),
      })
      setNewName('')
      void fetchLists()
    } finally {
      setCreating(false)
    }
  }

  async function deleteList(id: string) {
    setDeletingListId(id)
    try {
      await fetch(`${API}/v1/contact-lists/${id}`, { method: 'DELETE', headers: authHeaders() })
      setLists((prev) => prev.filter((l) => l.id !== id))
      if (activeList?.id === id) setActiveList(null)
    } finally {
      setDeletingListId(null)
    }
  }

  async function openList(list: ContactList) {
    setActiveList(list)
    setMembersLoading(true)
    const [membersRes, contactsRes] = await Promise.all([
      fetch(`${API}/v1/contact-lists/${list.id}/members?limit=100`, { headers: authHeaders() }).then((r) => r.json() as Promise<{ data: Contact[] }>),
      fetch(`${API}/v1/contacts?limit=100`, { headers: authHeaders() }).then((r) => r.json() as Promise<{ data: Contact[] }>),
    ])
    setMembers(membersRes.data ?? [])
    setAllContacts(contactsRes.data ?? [])
    setMembersLoading(false)
  }

  async function addMember(contactId: string) {
    if (!activeList) return
    setAddingId(contactId)
    try {
      await fetch(`${API}/v1/contact-lists/${activeList.id}/members`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ contactIds: [contactId] }),
      })
      const contact = allContacts.find((c) => c.id === contactId)
      if (contact) setMembers((prev) => [...prev, contact])
      setLists((prev) => prev.map((l) => l.id === activeList.id ? { ...l, contactCount: l.contactCount + 1 } : l))
    } finally {
      setAddingId(null)
    }
  }

  async function removeMember(contactId: string) {
    if (!activeList) return
    setRemovingId(contactId)
    try {
      await fetch(`${API}/v1/contact-lists/${activeList.id}/members/${contactId}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      setMembers((prev) => prev.filter((c) => c.id !== contactId))
      setLists((prev) => prev.map((l) => l.id === activeList.id ? { ...l, contactCount: Math.max(0, l.contactCount - 1) } : l))
    } finally {
      setRemovingId(null)
    }
  }

  const memberIds = new Set(members.map((m) => m.id))
  const filteredContacts = allContacts.filter(
    (c) => !memberIds.has(c.id) && (!contactSearch || c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.phoneNumber.includes(contactSearch)),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/contacts" className="text-sm text-text-secondary hover:text-text-primary transition-colors">← Contacts</a>
        <span className="text-text-muted">/</span>
        <h1 className="text-2xl font-bold text-text-primary">Contact Lists</h1>
      </div>

      <div className="flex gap-2">
        <input type="text" placeholder="New list name…" value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void createList() }}
          className="rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors" />
        <button onClick={createList} disabled={creating || !newName.trim()}
          className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          style={{ cursor: creating ? 'not-allowed' : 'pointer' }}>
          {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : '+ Create list'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists panel */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-text-secondary text-sm">No lists yet.</p>
          ) : (
            <div className="space-y-2">
              {lists.map((l) => (
                <div key={l.id}
                  className={`rounded-xl border p-4 cursor-pointer transition-colors ${activeList?.id === l.id ? 'border-primary/50' : 'border-border hover:border-primary/30'}`}
                  style={{ background: activeList?.id === l.id ? 'rgba(0,214,143,0.06)' : 'rgba(255,255,255,0.02)' }}
                  onClick={() => void openList(l)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{l.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">{l.contactCount} contacts</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); void deleteList(l.id) }}
                      disabled={deletingListId === l.id}
                      className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 disabled:opacity-50 transition-colors"
                      style={{ cursor: deletingListId === l.id ? 'not-allowed' : 'pointer' }}
                    >
                      {deletingListId === l.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members panel */}
        <div className="lg:col-span-2">
          {!activeList ? (
            <div className="rounded-xl border-2 border-dashed p-12 text-center text-text-muted text-sm" style={{ borderColor: '#1E2D45' }}>
              Select a list to manage its contacts
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1E2D45' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#1E2D45', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                  <h2 className="font-semibold text-text-primary">{activeList.name}</h2>
                  <p className="text-xs text-text-muted">{members.length} members</p>
                </div>
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: '#1E2D45' }}>
                  {members.length === 0 ? (
                    <p className="text-text-muted text-sm p-5">No members yet. Add contacts below.</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-2.5" style={{ borderColor: '#1E2D45' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{m.name ?? m.phoneNumber}</p>
                          {m.name && <p className="text-xs text-text-muted font-mono">{m.phoneNumber}</p>}
                        </div>
                        <button
                          onClick={() => void removeMember(m.id)}
                          disabled={removingId === m.id}
                          className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 disabled:opacity-50 shrink-0 transition-colors"
                          style={{ cursor: removingId === m.id ? 'not-allowed' : 'pointer' }}
                        >
                          {removingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Remove'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="border-t px-5 py-4" style={{ borderColor: '#1E2D45' }}>
                <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">Add Contacts</p>
                <input type="text" placeholder="Search contacts…" value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors mb-2" />
                <div className="divide-y max-h-48 overflow-y-auto border rounded-lg" style={{ borderColor: '#1E2D45' }}>
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-text-muted p-3">
                      {contactSearch ? 'No matching contacts' : 'All contacts already in this list'}
                    </p>
                  ) : (
                    filteredContacts.slice(0, 30).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2" style={{ borderColor: '#1E2D45' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{c.name ?? c.phoneNumber}</p>
                          {c.name && <p className="text-xs text-text-muted font-mono">{c.phoneNumber}</p>}
                        </div>
                        <button onClick={() => void addMember(c.id)} disabled={addingId === c.id}
                          className="text-xs text-primary hover:text-primary-dark disabled:opacity-50 shrink-0 transition-colors">
                          {addingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
