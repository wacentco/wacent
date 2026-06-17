'use client'

import { API_URL } from '../../../lib/config'
import { authHeaders, getToken } from '../../../lib/auth'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Message } from '@wacent/types'
import type { Device } from '@wacent/types'

const API = API_URL

// ── types ────────────────────────────────────────────────────────────────────

type MsgType = 'text' | 'image' | 'video' | 'audio' | 'document'

const MSG_TABS: { id: MsgType; label: string; accept?: string; hasCaption?: boolean }[] = [
  { id: 'text',     label: 'Text' },
  { id: 'image',    label: 'Image',    accept: 'image/jpeg,image/png,image/webp', hasCaption: true },
  { id: 'video',    label: 'Video',    accept: 'video/mp4',                       hasCaption: true },
  { id: 'audio',    label: 'Audio',    accept: 'audio/ogg,audio/mpeg' },
  { id: 'document', label: 'Document', accept: 'application/pdf' },
]

const STATUS_COLOR: Record<string, string> = {
  queued:    'bg-surface-raised text-text-secondary',
  sent:      'bg-blue-900/40 text-blue-400',
  delivered: 'bg-primary/10 text-primary',
  read:      'bg-purple-900/40 text-purple-400',
  failed:    'bg-danger/10 text-danger',
}

const TYPE_BADGE: Record<string, string> = {
  image:    'bg-pink-900/40 text-pink-400',
  video:    'bg-indigo-900/40 text-indigo-400',
  audio:    'bg-orange-900/40 text-orange-400',
  document: 'bg-yellow-900/40 text-yellow-400',
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 30

  const [showSend, setShowSend] = useState(false)
  const [sending, setSending] = useState(false)
  const [msgType, setMsgType] = useState<MsgType>('text')
  const [deviceId, setDeviceId] = useState('')
  const [phone, setPhone] = useState('')
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [lightbox, setLightbox] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API}/v1/messages?page=${page}&limit=${LIMIT}`, { headers: authHeaders() })
    const json = await res.json() as { data: Message[]; meta: { total?: number } }
    setMessages(json.data ?? [])
    setTotal(json.meta?.total ?? 0)
    setLoading(false)
  }, [page])

  useEffect(() => { void fetchMessages() }, [fetchMessages])

  useEffect(() => {
    void fetch(`${API}/v1/devices`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j: { data: Device[] }) => setDevices((j.data ?? []).filter((d) => d.status === 'connected')))
  }, [])

  function resetModal() {
    setMsgType('text')
    setDeviceId('')
    setPhone('')
    setContent('')
    setMediaUrl('')
    setCaption('')
    setPreviewUrl(null)
    setUploadError('')
    setSending(false)
    setUploading(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadError('')
    setUploading(true)
    setMediaUrl('')
    setPreviewUrl(null)

    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API}/v1/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    })
    const json = await res.json() as { data?: { url: string }; error?: { message: string } }

    if (!res.ok || !json.data) {
      setUploadError(json.error?.message ?? 'Upload failed')
    } else {
      setMediaUrl(json.data.url)
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file))
      }
    }
    setUploading(false)
  }

  async function sendMessage() {
    if (!deviceId || !phone) return
    setSending(true)
    await fetch(`${API}/v1/messages/send`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        whatsapp_account_id: deviceId,
        phone_number: phone,
        type: msgType,
        content: msgType === 'text' ? content : undefined,
        media_url: msgType !== 'text' ? mediaUrl : undefined,
        caption: caption || undefined,
      }),
    })
    setSending(false)
    setShowSend(false)
    resetModal()
    void fetchMessages()
  }

  const canSend = !!deviceId && !!phone && (msgType === 'text' ? !!content : !!mediaUrl)
  const currentTab = MSG_TABS.find((t) => t.id === msgType)!
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors'
  const selectCls = `${inputCls} cursor-pointer`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Messages</h1>
          <p className="text-sm text-text-secondary mt-1">{total.toLocaleString()} total</p>
        </div>
        <button
          onClick={() => { resetModal(); setShowSend(true) }}
          className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          + Send message
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <p className="text-text-secondary text-sm">No messages yet.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1E2D45' }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">To / From</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Type</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Content</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: '#1E2D45' }}>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                    {m.direction === 'outbound' ? `→ ${m.toNumber ?? '—'}` : `← ${m.fromNumber ?? '—'}`}
                  </td>
                  <td className="px-4 py-3">
                    {m.type !== 'text' ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[m.type] ?? ''}`}>{m.type}</span>
                    ) : (
                      <span className="text-xs text-text-muted">text</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {m.type === 'image' && m.mediaUrl ? (
                      <button onClick={() => setLightbox(m.mediaUrl!)} className="block">
                        <img src={m.mediaUrl} alt="media" className="h-12 w-16 object-cover rounded border hover:opacity-80 transition-opacity" style={{ borderColor: '#1E2D45' }} />
                        {m.caption && <p className="text-xs text-text-muted mt-0.5 truncate">{m.caption}</p>}
                      </button>
                    ) : m.type === 'video' && m.mediaUrl ? (
                      <div className="flex items-center gap-2">
                        <span>🎬</span>
                        <div>
                          <p className="text-xs text-text-secondary truncate max-w-[160px]">{m.mediaUrl.split('/').pop()}</p>
                          {m.caption && <p className="text-xs text-text-muted truncate">{m.caption}</p>}
                        </div>
                      </div>
                    ) : m.type === 'audio' && m.mediaUrl ? (
                      <div className="flex items-center gap-2">
                        <span>🎵</span>
                        <audio controls src={m.mediaUrl} className="h-7 max-w-[160px]" />
                      </div>
                    ) : m.type === 'document' && m.mediaUrl ? (
                      <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <span>📄</span>
                        <span className="truncate max-w-[160px]">{m.mediaUrl.split('/').pop()}</span>
                      </a>
                    ) : (
                      <span className="text-text-primary truncate block">{m.content ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[m.status] ?? ''}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm" style={{ borderColor: '#1E2D45', background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors" style={{ borderColor: '#1E2D45' }}>Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors" style={{ borderColor: '#1E2D45' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showSend && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="relative rounded-xl border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background: '#111827', borderColor: '#1E2D45' }}>
            <h2 className="text-lg font-bold text-text-primary mb-4">Send Message</h2>

            <div className="flex border-b mb-4 gap-0" style={{ borderColor: '#1E2D45' }}>
              {MSG_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setMsgType(tab.id); setMediaUrl(''); setPreviewUrl(null); setUploadError('') }}
                  className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    msgType === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Device</label>
                <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={selectCls}>
                  <option value="">Select a connected device</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.phoneNumber ?? 'no number'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Phone number (E.164)</label>
                <input type="text" placeholder="+628123456789" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>

              {msgType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Message</label>
                  <textarea rows={4} placeholder="Type your message…" value={content} onChange={(e) => setContent(e.target.value)} className={`${inputCls} resize-none`} />
                </div>
              )}

              {msgType !== 'text' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    {currentTab.label} file <span className="text-text-muted font-normal">(max 16 MB)</span>
                  </label>
                  <input ref={fileRef} type="file" accept={currentTab.accept} className="hidden" onChange={handleFileChange} />
                  {!mediaUrl && !uploading && (
                    <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed rounded-lg p-6 text-sm text-text-muted hover:border-primary hover:text-primary transition-colors" style={{ borderColor: '#1E2D45' }}>
                      Click to choose {currentTab.label.toLowerCase()} file
                    </button>
                  )}
                  {uploading && <div className="w-full border rounded-lg p-4 text-sm text-text-muted text-center" style={{ borderColor: '#1E2D45' }}>Uploading…</div>}
                  {uploadError && <p className="text-xs text-danger mt-1">{uploadError}</p>}
                  {mediaUrl && msgType === 'image' && (
                    <div className="relative">
                      {previewUrl && <img src={previewUrl} alt="preview" className="w-full rounded-lg object-cover max-h-48 border" style={{ borderColor: '#1E2D45' }} />}
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-primary flex-1 truncate">✓ {mediaUrl.split('/').pop()}</p>
                        <button onClick={() => { setMediaUrl(''); setPreviewUrl(null) }} className="text-xs text-text-muted hover:text-danger">Remove</button>
                      </div>
                    </div>
                  )}
                  {mediaUrl && msgType !== 'image' && (
                    <div className="flex items-center gap-2 border rounded-lg p-3" style={{ borderColor: '#1E2D45' }}>
                      <span>{msgType === 'video' ? '🎬' : msgType === 'audio' ? '🎵' : '📄'}</span>
                      <p className="text-xs text-primary flex-1 truncate">✓ {mediaUrl.split('/').pop()}</p>
                      <button onClick={() => setMediaUrl('')} className="text-xs text-text-muted hover:text-danger">Remove</button>
                    </div>
                  )}
                </div>
              )}

              {currentTab.hasCaption && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Caption <span className="text-text-muted font-normal">(optional)</span></label>
                  <input type="text" placeholder="Add a caption…" value={caption} onChange={(e) => setCaption(e.target.value)} className={inputCls} />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => { setShowSend(false); resetModal() }} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button
                onClick={sendMessage}
                disabled={sending || !canSend || uploading}
                className="flex items-center gap-2 bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                style={{ cursor: sending ? 'not-allowed' : 'pointer' }}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full size" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
