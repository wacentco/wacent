import makeWASocket, {
  DisconnectReason,
  type WASocket,
  type BaileysEventMap,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import type { Redis } from 'ioredis'
import { useRedisAuthState } from './redisAuthState.js'
import { onQR } from '../handlers/onQR.js'
import { onStatus } from '../handlers/onStatus.js'
import { onMessage } from '../handlers/onMessage.js'

export type SessionStatus = 'disconnected' | 'connecting' | 'connected'

interface SessionEntry {
  socket: WASocket
  status: SessionStatus
  qr: string | null
}

export class SessionManager {
  private sessions = new Map<string, SessionEntry>()

  constructor(
    private redis: Redis,
  ) {}

  async startSession(deviceId: string): Promise<void> {
    if (this.sessions.has(deviceId)) return

    const { state, saveCreds } = await useRedisAuthState(deviceId, this.redis)

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
    })

    const entry: SessionEntry = { socket, status: 'connecting', qr: null }
    this.sessions.set(deviceId, entry)

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        entry.qr = qr
        void onQR(deviceId, qr, this.redis)
      }

      if (connection === 'open') {
        entry.status = 'connected'
        entry.qr = null
        void onStatus(deviceId, 'connected', this.redis)
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        entry.status = 'disconnected'
        void onStatus(deviceId, 'disconnected', this.redis)
        this.sessions.delete(deviceId)

        if (shouldReconnect) {
          setTimeout(() => void this.startSession(deviceId), 5000)
        }
      }
    })

    socket.ev.on('messages.upsert', (upsert) => {
      void onMessage(deviceId, upsert, this.redis)
    })
  }

  async stopSession(deviceId: string): Promise<void> {
    const entry = this.sessions.get(deviceId)
    if (!entry) return
    await entry.socket.logout()
    this.sessions.delete(deviceId)
  }

  async sendMessage(
    deviceId: string,
    to: string,
    payload: { type: string; content: string | undefined; mediaUrl: string | undefined; caption: string | undefined },
  ): Promise<string> {
    const entry = this.sessions.get(deviceId)
    if (!entry || entry.status !== 'connected') {
      throw new Error('Device not connected')
    }

    const jid = to.replace('+', '') + '@s.whatsapp.net'
    let result

    if (payload.type === 'text') {
      result = await entry.socket.sendMessage(jid, { text: payload.content ?? '' })
    } else if (payload.mediaUrl) {
      const url = payload.mediaUrl
      const cap = payload.caption ?? undefined

      switch (payload.type) {
        case 'image':
          result = await entry.socket.sendMessage(jid, {
            image: { url },
            ...(cap ? { caption: cap } : {}),
          })
          break
        case 'video':
          result = await entry.socket.sendMessage(jid, {
            video: { url },
            ...(cap ? { caption: cap } : {}),
          })
          break
        case 'audio':
          result = await entry.socket.sendMessage(jid, { audio: { url }, ptt: false })
          break
        case 'document': {
          const fileName = url.split('/').pop() ?? 'file'
          const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
          const mimeMap: Record<string, string> = {
            pdf: 'application/pdf',
            mp4: 'video/mp4',
            ogg: 'audio/ogg',
            mp3: 'audio/mpeg',
          }
          const mimetype = mimeMap[ext] ?? 'application/octet-stream'
          result = await entry.socket.sendMessage(jid, {
            document: { url },
            mimetype,
            fileName,
            ...(cap ? { caption: cap } : {}),
          })
          break
        }
        default:
          result = await entry.socket.sendMessage(jid, { image: { url }, ...(cap ? { caption: cap } : {}) })
      }
    } else {
      throw new Error('Invalid message payload: missing content or media_url')
    }

    return result?.key.id ?? ''
  }

  getQR(deviceId: string): string | null {
    return this.sessions.get(deviceId)?.qr ?? null
  }

  getStatus(deviceId: string): SessionStatus {
    return this.sessions.get(deviceId)?.status ?? 'disconnected'
  }
}
