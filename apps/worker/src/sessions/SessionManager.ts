import {
  makeWASocket,
  DisconnectReason,
  type WASocket,
  type ConnectionState,
  type WAMessage,
  type MessageUpsertType,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import type { Redis } from 'ioredis'
import { useRedisAuthState } from './redisAuthState.js'
import { onQR } from '../handlers/onQR.js'
import { onStatus } from '../handlers/onStatus.js'
import { onMessage } from '../handlers/onMessage.js'
import { validateWhatsAppNumber } from '../handlers/validateNumber.js'

export type SessionStatus = 'disconnected' | 'connecting' | 'connected'

interface SessionEntry {
  socket: WASocket
  status: SessionStatus
  qr: string | null
}

const HOUR_LIMIT = 200
const DAY_LIMIT = 1000

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function midnightTTL(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
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

    socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        entry.qr = qr
        void onQR(deviceId, qr, this.redis)
      }

      if (connection === 'open') {
        entry.status = 'connected'
        entry.qr = null
        // Extract phone number: "628xxx:12@s.whatsapp.net" → "628xxx" (no '+', with country code)
        const rawId = socket.user?.id
        const phoneNumber = rawId?.split('@')[0]?.split(':')[0] ?? null
        void onStatus(deviceId, 'connected', this.redis, phoneNumber)
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

    socket.ev.on('messages.upsert', (upsert: { messages: WAMessage[]; type: MessageUpsertType }) => {
      void onMessage(deviceId, upsert, this.redis)
    })

    socket.ev.on('messages.update', (updates: { update: { status?: number }; key: { id?: string | null } }[]) => {
      for (const update of updates) {
        const status = update.update.status
        const waMessageId = update.key.id
        if (!status || !waMessageId) continue
        void this.redis.publish(
          'wacent:events:status',
          JSON.stringify({ deviceId, waMessageId, status, timestamp: new Date().toISOString() }),
        )
      }
    })
  }

  async stopSession(deviceId: string): Promise<void> {
    const entry = this.sessions.get(deviceId)
    if (!entry) return
    await entry.socket.logout()
    this.sessions.delete(deviceId)
  }

  private async checkRateLimit(deviceId: string): Promise<void> {
    const hourKey = `ratelimit:${deviceId}:hour`
    const dayKey = `ratelimit:${deviceId}:day`

    const pipe = this.redis.pipeline()
    pipe.incr(hourKey)
    pipe.incr(dayKey)
    const results = await pipe.exec()

    const hourCount = (results?.[0]?.[1] as number) ?? 0
    const dayCount = (results?.[1]?.[1] as number) ?? 0

    if (hourCount === 1) await this.redis.expire(hourKey, 3600)
    if (dayCount === 1) await this.redis.expire(dayKey, midnightTTL())

    if (dayCount > DAY_LIMIT) {
      throw new Error('DAILY_LIMIT_EXCEEDED')
    }
    if (hourCount > HOUR_LIMIT) {
      // Queue by sleeping until the hour window rolls over — caller handles retry
      throw new Error('HOURLY_LIMIT_EXCEEDED')
    }
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

    await this.checkRateLimit(deviceId)

    // Validate number is on WhatsApp (cached)
    await validateWhatsAppNumber(to, entry.socket, this.redis)

    // Anti-spam delay
    await sleep(randInt(1000, 3000))

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
