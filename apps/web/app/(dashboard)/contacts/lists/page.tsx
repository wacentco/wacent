'use client'

import { API_URL } from '../../../../lib/config'
import { useEffect, useState, useCallback } from 'react'
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

  // Manage members modal
  const [activeList, setActiveList] = useState<ContactList | null>(null)
  const [members, setMembers] = useState<Contact[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Add contacts panel
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
    await fetch(`${API}/v1/contact-lists`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: newName }),
    })
    setCreating(false)
    setNewName('')
    void fetchLists()
  }

  async function deleteList(id: string) {
    await fetch(`${API}/v1/contact-lists/${id}`, { method: 'DELETE', headers: authHeaders() })
    setLists((prev) => prev.filter((l) => l.id !== id))
    if (activeList?.id === id) setActiveList(null)
  }

  async function openList(list: ContactList) {
    setActiveList(list)
    setMembersLoading(true)
    const [membersRes, contactsRes] = await Promise.all([
      fetch(`${API}/v1/contact-lists/${list.id}/members?limit=100`, { headers: authHeaders() })
        .then((r) => r.json() as Promise<{ data: Contact[] }>),
      fetch(`${API}/v1/contacts?limit=100`, { headers: authHeaders() })
        .then((r) => r.json() as Promise<{ data: Contact[] }>),
    ])
    setMembers(membersRes.data ?? [])
    setAllContacts(contactsRes.data ?? [])
    setMembersLoading(false)
  }

  async function addMember(contactId: string) {
    if (!activeList) return
    setAddingId(contactId)
    await fetch(`${API}/v1/contact-lists/${activeList.id}/members`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ contactIds: [contactId] }),
    })
    const contact = allContacts.find((c) => c.id === contactId)
    if (contact) setMembers((prev) => [...prev, contact])
    setLists((prev) => prev.map((l) => l.id === activeList.id ? { ...l, contactCount: l.contactCount + 1 } : l))
    setAddingId(null)
  }

  async function removeMember(contactId: string) {
    if (!activeList) return
    await fetch(`${API}/v1/contact-lists/${activeList.id}/members/${contactId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    setMembers((prev) => prev.filter((c) => c.id !== contactId))
    setLists((prev) => prev.map((l) => l.id === activeList.id ? { ...l, contactCount: Math.max(0, l.contactCount - 1) } : l))
  }

  const memberIds = new Set(members.map((m) => m.id))
  const filteredContacts = allContacts.filter(
    (c) =>
      !memberIds.has(c.id) &&
      (!contactSearch ||
        c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        c.phoneNumber.includes(contactSearch)),
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/contacts" className="text-sm text-gray-500 hover:text-gray-800">← Contacts</a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold">Contact Lists</h1>
      </div>

      {/* Create list */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="New list name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void createList() }}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={createList}
          disabled={creating || !newName.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {creating ? 'Creating…' : '+ Create list'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists panel */}
        <div className="lg:col-span-1">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : lists.length === 0 ? (
            <p className="text-gray-500 text-sm">No lists yet.</p>
          ) : (
            <div className="space-y-2">
              {lists.map((l) => (
                <div
                  key={l.id}
                  className={`bg-white rounded-xl border p-4 cursor-pointer hover:border-green-400 transition-colors ${
                    activeList?.id === l.id ? 'border-green-500 ring-1 ring-green-500' : ''
                  }`}
                  onClick={() => void openList(l)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{l.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{l.contactCount} contacts</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); void deleteList(l.id) }}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline"
                    >
                      Delete
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
            <div className="bg-gray-50 rounded-xl border-2 border-dashed p-12 text-center text-gray-400 text-sm">
              Select a list to manage its contacts
            </div>
          ) : (
            <div className="bg-white rounded-xl border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{activeList.name}</h2>
                  <p className="text-xs text-gray-400">{members.length} members</p>
                </div>
              </div>

              {membersLoading ? (
                <p className="text-gray-500 text-sm p-5">Loading…</p>
              ) : (
                <div className="divide-y max-h-64 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="text-gray-400 text-sm p-5">No members yet. Add contacts below.</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{m.name ?? m.phoneNumber}</p>
                          {m.name && <p className="text-xs text-gray-400 font-mono">{m.phoneNumber}</p>}
                        </div>
                        <button
                          onClick={() => void removeMember(m.id)}
                          className="text-xs text-red-400 hover:underline shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add contacts */}
              <div className="border-t px-5 py-4">
                <p className="text-xs font-medium text-gray-500 mb-2">ADD CONTACTS</p>
                <input
                  type="text"
                  placeholder="Search contacts…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                />
                <div className="divide-y max-h-48 overflow-y-auto border rounded-lg">
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3">
                      {contactSearch ? 'No matching contacts' : 'All contacts already in this list'}
                    </p>
                  ) : (
                    filteredContacts.slice(0, 30).map((c) => (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{c.name ?? c.phoneNumber}</p>
                          {c.name && <p className="text-xs text-gray-400 font-mono">{c.phoneNumber}</p>}
                        </div>
                        <button
                          onClick={() => void addMember(c.id)}
                          disabled={addingId === c.id}
                          className="text-xs text-green-600 hover:underline shrink-0 disabled:opacity-50"
                        >
                          Add
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
