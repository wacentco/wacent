'use client'

import { API_URL } from '../../../lib/config'
import { authHeaders } from '../../../lib/auth'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import type { Contact } from '@wacent/types'

const API = API_URL

interface ContactForm {
  phoneNumber: string
  name: string
  email: string
  tags: string
}

const EMPTY_FORM: ContactForm = { phoneNumber: '', name: '', email: '', tags: '' }

interface CsvRow { phoneNumber?: string; phone?: string; name?: string; email?: string; tags?: string }
interface ImportResult { created: number; failed: number; errors: Array<{ row: number; phone: string; reason: string }> }

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  function openCreate() { setForm(EMPTY_FORM); setEditTarget(null); setModal('create') }
  function openEdit(c: Contact) {
    setForm({ phoneNumber: c.phoneNumber, name: c.name ?? '', email: c.email ?? '', tags: (c.tags as string[] | null)?.join(', ') ?? '' })
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
    try {
      if (modal === 'create') {
        await fetch(`${API}/v1/contacts`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
      } else if (editTarget) {
        await fetch(`${API}/v1/contacts/${editTarget.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) })
      }
      setModal(null)
      void fetchContacts()
    } finally {
      setSaving(false)
    }
  }

  async function deleteContact(id: string) {
    setDeletingId(id)
    try {
      await fetch(`${API}/v1/contacts/${id}`, { method: 'DELETE', headers: authHeaders() })
      setContacts((prev) => prev.filter((c) => c.id !== id))
      setTotal((t) => t - 1)
    } finally {
      setDeletingId(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => { setCsvRows(result.data); setShowImportPreview(true) },
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
    try {
      const payload = csvRows.map(csvRowToContact).filter((r) => r.phoneNumber)
      const res = await fetch(`${API}/v1/contacts/import`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ contacts: payload }),
      })
      const json = await res.json() as { data: ImportResult }
      setImportResult(json.data)
      setShowImportPreview(false)
      setCsvRows([])
      void fetchContacts()
    } finally {
      setImporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Contacts</h1>
          <p className="text-sm text-text-secondary mt-1">{total.toLocaleString()} total</p>
        </div>
        <div className="flex gap-2">
          <a href="/contacts/lists" className="border border-border text-text-secondary px-4 py-2 rounded-lg text-sm font-medium hover:text-text-primary hover:border-primary/50 transition-colors">
            Lists
          </a>
          <button onClick={() => fileRef.current?.click()}
            className="border border-border text-text-secondary px-4 py-2 rounded-lg text-sm font-medium hover:text-text-primary hover:border-primary/50 transition-colors">
            Import CSV
          </button>
          <button onClick={openCreate}
            className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
            + Add contact
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

      {importResult && (
        <div className={`p-4 rounded-xl border text-sm ${importResult.failed > 0 ? 'border-warning/30 text-warning' : 'border-primary/30 text-primary'}`}
          style={{ background: importResult.failed > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(0,214,143,0.08)' }}>
          <p className="font-medium">
            {importResult.created} contacts imported{importResult.failed > 0 ? `, ${importResult.failed} failed` : ' successfully.'}
          </p>
          {importResult.errors.length > 0 && (
            <ul className="mt-1 text-xs text-text-secondary space-y-0.5">
              {importResult.errors.slice(0, 5).map((e) => (
                <li key={e.row}>Row {e.row} ({e.phone}): {e.reason}</li>
              ))}
              {importResult.errors.length > 5 && <li>â€¦and {importResult.errors.length - 5} more</li>}
            </ul>
          )}
          <button onClick={() => setImportResult(null)} className="mt-1 text-xs text-text-muted hover:text-text-secondary">Dismiss</button>
        </div>
      )}

      <div className="flex gap-2">
        <input type="text" placeholder="Search by name or phoneâ€¦" value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
          className="rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors flex-1 max-w-xs" />
        <button onClick={() => { setSearch(searchInput); setPage(1) }}
          className="border border-border px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
          Search
        </button>
        {search && (
          <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors">
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <p className="text-text-secondary text-sm">{search ? 'No contacts match your search.' : 'No contacts yet. Add one or import a CSV.'}</p>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1E2D45' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr className="border-b" style={{ borderColor: '#1E2D45' }}>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Name</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Email</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1E2D45' }}>
                  <td className="px-4 py-3 font-medium text-text-primary">{c.name ?? <span className="text-text-muted italic">No name</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{c.phoneNumber}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{c.email ?? 'â€”'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {((c.tags as string[] | null) ?? []).map((tag) => (
                        <span key={tag} className="text-xs text-accent px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)' }}>{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="text-xs text-text-secondary hover:text-primary mr-3 transition-colors">Edit</button>
                    <button
                      onClick={() => void deleteContact(c.id)}
                      disabled={deletingId === c.id}
                      className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 disabled:opacity-50 transition-colors inline-flex"
                      style={{ cursor: deletingId === c.id ? 'not-allowed' : 'pointer' }}
                    >
                      {deletingId === c.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Deletingâ€¦</> : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm" style={{ borderColor: '#1E2D45', background: 'rgba(255,255,255,0.01)' }}>
              <span className="text-text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 border border-border rounded text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 border border-border rounded text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl border p-6 w-full max-w-md" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <h2 className="text-lg font-bold text-text-primary mb-4">{modal === 'create' ? 'Add Contact' : 'Edit Contact'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Phone (E.164) *</label>
                <input type="text" placeholder="+628123456789" value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                <input type="text" placeholder="Full name" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                <input type="email" placeholder="email@example.com" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Tags (comma-separated)</label>
                <input type="text" placeholder="vip, customer, newsletter" value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.phoneNumber}
                className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                style={{ cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Savingâ€¦</> : modal === 'create' ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl border p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <h2 className="text-lg font-bold text-text-primary mb-1">Import Preview</h2>
            <p className="text-sm text-text-secondary mb-4">
              {csvRows.length} rows found. Columns: <code className="text-xs bg-surface border border-border rounded px-1 text-primary">phoneNumber</code> or <code className="text-xs bg-surface border border-border rounded px-1 text-primary">phone</code> required.
            </p>
            <div className="overflow-auto flex-1 border rounded-lg" style={{ borderColor: '#1E2D45' }}>
              <table className="w-full text-xs">
                <thead style={{ background: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0 }}>
                  <tr className="border-b" style={{ borderColor: '#1E2D45' }}>
                    <th className="text-left px-3 py-2 font-medium text-text-muted">#</th>
                    <th className="text-left px-3 py-2 font-medium text-text-muted">Phone</th>
                    <th className="text-left px-3 py-2 font-medium text-text-muted">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-text-muted">Email</th>
                    <th className="text-left px-3 py-2 font-medium text-text-muted">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: '#1E2D45', background: !(row.phoneNumber ?? row.phone) ? 'rgba(239,68,68,0.08)' : undefined }}>
                      <td className="px-3 py-1.5 text-text-muted">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-text-primary">{row.phoneNumber ?? row.phone ?? <span className="text-danger">missing</span>}</td>
                      <td className="px-3 py-1.5 text-text-secondary">{row.name ?? 'â€”'}</td>
                      <td className="px-3 py-1.5 text-text-secondary">{row.email ?? 'â€”'}</td>
                      <td className="px-3 py-1.5 text-text-secondary">{row.tags ?? 'â€”'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 100 && <p className="text-xs text-text-muted text-center py-2">â€¦and {csvRows.length - 100} more rows</p>}
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setCsvRows([]); setShowImportPreview(false) }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={confirmImport} disabled={importing}
                className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                style={{ cursor: importing ? 'not-allowed' : 'pointer' }}>
                {importing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importingâ€¦</> : `Import ${csvRows.filter((r) => r.phoneNumber ?? r.phone).length} contacts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
