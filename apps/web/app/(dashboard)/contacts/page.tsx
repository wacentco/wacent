'use client'

import { API_URL } from '../../../lib/config'
import { useEffect, useRef, useState, useCallback } from 'react'
import Papa from 'papaparse'
import type { Contact } from '@wacent/types'

const API = API_URL

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wc_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

interface ContactForm {
  phoneNumber: string
  name: string
  email: string
  tags: string
}

const EMPTY_FORM: ContactForm = { phoneNumber: '', name: '', email: '', tags: '' }

interface CsvRow { phoneNumber?: string; phone?: string; name?: string; email?: string; tags?: string }
interface ImportResult { created: number; failed: number; errors: Array<{ row: number; phone: string; reason: string }> }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Contact | null>(null)
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // CSV import state
  const fileRef = useRef<HTMLInputElement>(null)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [showImportPreview, setShowImportPreview] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const LIMIT = 20

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (search) params.set('search', search)
    const res = await fetch(`${API}/v1/contacts?${params}`, { headers: authHeaders() })
    const json = await res.json() as { data: Contact[]; meta: { total: number } }
    setContacts(json.data ?? [])
    setTotal(json.meta?.total ?? 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => { void fetchContacts() }, [fetchContacts])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setModal('create')
  }

  function openEdit(c: Contact) {
    setForm({
      phoneNumber: c.phoneNumber,
      name: c.name ?? '',
      email: c.email ?? '',
      tags: (c.tags as string[] | null)?.join(', ') ?? '',
    })
    setEditTarget(c)
    setModal('edit')
  }

  async function save() {
    setSaving(true)
    const payload = {
      phoneNumber: form.phoneNumber,
      name: form.name || undefined,
      email: form.email || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    }

    if (modal === 'create') {
      await fetch(`${API}/v1/contacts`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
    } else if (editTarget) {
      await fetch(`${API}/v1/contacts/${editTarget.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
    }

    setSaving(false)
    setModal(null)
    void fetchContacts()
  }

  async function deleteContact(id: string) {
    await fetch(`${API}/v1/contacts/${id}`, { method: 'DELETE', headers: authHeaders() })
    setContacts((prev) => prev.filter((c) => c.id !== id))
    setTotal((t) => t - 1)
  }

  // CSV parsing
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setCsvRows(result.data)
        setShowImportPreview(true)
      },
    })
    e.target.value = ''
  }

  function csvRowToContact(row: CsvRow) {
    return {
      phoneNumber: (row.phoneNumber ?? row.phone ?? '').trim(),
      name: row.name?.trim() || undefined,
      email: row.email?.trim() || undefined,
      tags: row.tags ? row.tags.split(';').map((t) => t.trim()).filter(Boolean) : undefined,
    }
  }

  async function confirmImport() {
    setImporting(true)
    const payload = csvRows.map(csvRowToContact).filter((r) => r.phoneNumber)
    const res = await fetch(`${API}/v1/contacts/import`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ contacts: payload }),
    })
    const json = await res.json() as { data: ImportResult }
    setImportResult(json.data)
    setImporting(false)
    setShowImportPreview(false)
    setCsvRows([])
    void fetchContacts()
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex gap-2">
          <a href="/contacts/lists" className="border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Lists
          </a>
          <button
            onClick={() => fileRef.current?.click()}
            className="border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Import CSV
          </button>
          <button
            onClick={openCreate}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            + Add contact
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

      {/* Import result banner */}
      {importResult && (
        <div className={`mb-4 p-4 rounded-xl text-sm ${importResult.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="font-medium">
            {importResult.created} contacts imported{importResult.failed > 0 ? `, ${importResult.failed} failed` : ' successfully.'}
          </p>
          {importResult.errors.length > 0 && (
            <ul className="mt-1 text-xs text-gray-600 space-y-0.5">
              {importResult.errors.slice(0, 5).map((e) => (
                <li key={e.row}>Row {e.row} ({e.phone}): {e.reason}</li>
              ))}
              {importResult.errors.length > 5 && <li>…and {importResult.errors.length - 5} more</li>}
            </ul>
          )}
          <button onClick={() => setImportResult(null)} className="mt-1 text-xs text-gray-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search by name or phone…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
          className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
        />
        <button
          onClick={() => { setSearch(searchInput); setPage(1) }}
          className="border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Search
        </button>
        {search && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-gray-500">{search ? 'No contacts match your search.' : 'No contacts yet. Add one or import a CSV.'}</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name ?? <span className="text-gray-400 italic">No name</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{c.phoneNumber}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {((c.tags as string[] | null) ?? []).map((tag) => (
                        <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => deleteContact(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
              <span className="text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded text-gray-600 hover:bg-white disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded text-gray-600 hover:bg-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{modal === 'create' ? 'Add Contact' : 'Edit Contact'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (E.164) *</label>
                <input
                  type="text"
                  placeholder="+628123456789"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="vip, customer, newsletter"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button
                onClick={save}
                disabled={saving || !form.phoneNumber}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : modal === 'create' ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV import preview modal */}
      {showImportPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold mb-1">Import Preview</h2>
            <p className="text-sm text-gray-500 mb-4">
              {csvRows.length} rows found. Columns: <code className="text-xs bg-gray-100 px-1 rounded">phoneNumber</code> or <code className="text-xs bg-gray-100 px-1 rounded">phone</code> required.
            </p>
            <div className="overflow-auto flex-1 border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {csvRows.slice(0, 100).map((row, i) => (
                    <tr key={i} className={!(row.phoneNumber ?? row.phone) ? 'bg-red-50' : ''}>
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono">{row.phoneNumber ?? row.phone ?? <span className="text-red-500">missing</span>}</td>
                      <td className="px-3 py-1.5">{row.name ?? '—'}</td>
                      <td className="px-3 py-1.5">{row.email ?? '—'}</td>
                      <td className="px-3 py-1.5">{row.tags ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 100 && (
                <p className="text-xs text-gray-400 text-center py-2">…and {csvRows.length - 100} more rows</p>
              )}
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setCsvRows([]); setShowImportPreview(false) }} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${csvRows.filter((r) => r.phoneNumber ?? r.phone).length} contacts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
