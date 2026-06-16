'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Message } from '@wazap/types'
import type { Device } from '@wazap/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

function authHeaders(contentType?: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wz_token') ?? '' : ''
  const h: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (contentType) h['Content-Type'] = contentType
  return h
}

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
  queued:    'bg-gray-100 text-gray-700',
  sent:      'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  read:      'bg-purple-100 text-purple-700',
  failed:    'bg-red-100 text-red-700',
}

const TYPE_BADGE: Record<string, string> = {
  image:    'bg-pink-50 text-pink-700',
  video:    'bg-indigo-50 text-indigo-700',
  audio:    'bg-orange-50 text-orange-700',
  document: 'bg-yellow-50 text-yellow-700',
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 30

  // send modal
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

  // lightbox
  const [lightbox, setLightbox] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API}/v1/messages?page=${page}&limit=${LIMIT}`, { headers: authHeaders('application/json') })
    const json = await res.json() as { data: Message[]; meta: { total?: number } }
    setMessages(json.data ?? [])
    setTotal(json.meta?.total ?? 0)
    setLoading(false)
  }, [page])

  useEffect(() => { void fetchMessages() }, [fetchMessages])

  useEffect(() => {
    void fetch(`${API}/v1/devices`, { headers: authHeaders('application/json') })
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
      headers: { Authorization: `Bearer ${localStorage.getItem('wz_token') ?? ''}` },
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
      headers: authHeaders('application/json'),
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

  const canSend =
    !!deviceId &&
    !!phone &&
    (msgType === 'text' ? !!content : !!mediaUrl)

  const currentTab = MSG_TABS.find((t) => t.id === msgType)!
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button
          onClick={() => { resetModal(); setShowSend(true) }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          + Send message
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-gray-500">No messages yet.</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">To / From</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Content</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {messages.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  {/* Direction + number */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {m.direction === 'outbound' ? `→ ${m.toNumber ?? '—'}` : `← ${m.fromNumber ?? '—'}`}
                  </td>

                  {/* Type badge */}
                  <td className="px-4 py-3">
                    {m.type !== 'text' ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[m.type] ?? ''}`}>
                        {m.type}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">text</span>
                    )}
                  </td>

                  {/* Content / thumbnail */}
                  <td className="px-4 py-3 max-w-xs">
                    {m.type === 'image' && m.mediaUrl ? (
                      <button onClick={() => setLightbox(m.mediaUrl!)} className="block">
                        <img
                          src={m.mediaUrl}
                          alt="media"
                          className="h-12 w-16 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                        {m.caption && <p className="text-xs text-gray-500 mt-0.5 truncate">{m.caption}</p>}
                      </button>
                    ) : m.type === 'video' && m.mediaUrl ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎬</span>
                        <div>
                          <p className="text-xs text-gray-600 truncate max-w-[160px]">{m.mediaUrl.split('/').pop()}</p>
                          {m.caption && <p className="text-xs text-gray-400 truncate">{m.caption}</p>}
                        </div>
                      </div>
                    ) : m.type === 'audio' && m.mediaUrl ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎵</span>
                        <audio controls src={m.mediaUrl} className="h-7 max-w-[160px]" />
                      </div>
                    ) : m.type === 'document' && m.mediaUrl ? (
                      <a
                        href={m.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                      >
                        <span>📄</span>
                        <span className="truncate max-w-[160px]">{m.mediaUrl.split('/').pop()}</span>
                      </a>
                    ) : (
                      <span className="text-gray-700 truncate block">{m.content ?? '—'}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[m.status] ?? ''}`}>
                      {m.status}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
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
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-gray-600 hover:bg-white disabled:opacity-40">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded text-gray-600 hover:bg-white disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Send modal ───────────────────────────────────────────────────── */}
      {showSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Send Message</h2>

            {/* Type tabs */}
            <div className="flex border-b mb-4 gap-0 -mx-1">
              {MSG_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setMsgType(tab.id); setMediaUrl(''); setPreviewUrl(null); setUploadError('') }}
                  className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    msgType === tab.id
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* Device */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a connected device</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.phoneNumber ?? 'no number'})</option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number (E.164)</label>
                <input
                  type="text"
                  placeholder="+628123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Text message */}
              {msgType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    placeholder="Type your message…"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                  />
                </div>
              )}

              {/* Media upload */}
              {msgType !== 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {currentTab.label} file <span className="text-gray-400 font-normal">(max 16 MB)</span>
                  </label>

                  {/* Hidden file input */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept={currentTab.accept}
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {!mediaUrl && !uploading && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors"
                    >
                      Click to choose {currentTab.label.toLowerCase()} file
                    </button>
                  )}

                  {uploading && (
                    <div className="w-full border rounded-lg p-4 text-sm text-gray-500 text-center">
                      Uploading…
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                  )}

                  {/* Image preview */}
                  {mediaUrl && msgType === 'image' && (
                    <div className="relative">
                      {previewUrl && (
                        <img src={previewUrl} alt="preview" className="w-full rounded-lg object-cover max-h-48 border" />
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-green-700 flex-1 truncate">✓ {mediaUrl.split('/').pop()}</p>
                        <button onClick={() => { setMediaUrl(''); setPreviewUrl(null) }} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
                      </div>
                    </div>
                  )}

                  {/* Non-image media uploaded */}
                  {mediaUrl && msgType !== 'image' && (
                    <div className="flex items-center gap-2 border rounded-lg p-3">
                      <span className="text-xl">{msgType === 'video' ? '🎬' : msgType === 'audio' ? '🎵' : '📄'}</span>
                      <p className="text-xs text-green-700 flex-1 truncate">✓ {mediaUrl.split('/').pop()}</p>
                      <button onClick={() => setMediaUrl('')} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
                    </div>
                  )}
                </div>
              )}

              {/* Caption (image / video) */}
              {currentTab.hasCaption && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caption <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="Add a caption…"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => { setShowSend(false); resetModal() }}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={sendMessage}
                disabled={sending || !canSend || uploading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
