import { Worker } from 'bullmq'
import { db } from '@wacent/db'
import { devices, messages } from '@wacent/db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { QUEUE_NAMES } from '@wacent/queue'
import type { WarmDeviceJobData } from '@wacent/queue'
import { redisConn } from '../lib/redis.js'

const WORKER_URL = process.env['WORKER_URL'] ?? 'http://localhost:3001'
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

const POOL_NUMBERS = (process.env['WARM_POOL_NUMBERS'] ?? '')
  .split(',')
  .map((n) => n.trim())
  .filter(Boolean)

const WARM_TEXTS = [
  'Hey!', 'Hello', 'Hi there 👋', 'Good morning!', 'How are you?',
  'Checking in', '🙂', 'Hope you\'re well!', 'Hello there', 'Hi!',
]

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// Map warm_progress (0-100) → estimated day (1-30)
function progressToDay(progress: number): number {
  return Math.max(1, Math.round((progress / 100) * 30))
}

function quotaForDay(day: number): number {
  if (day <= 2) return randInt(5, 10)
  if (day <= 5) return randInt(20, 50)
  if (day <= 10) return randInt(100, 200)
  if (day <= 14) return randInt(300, 500)
  return randInt(500, 1000)
}

async function sendWarmMessage(deviceId: string, to: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${WORKER_URL}/internal/sessions/${deviceId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': WORKER_SECRET },
      body: JSON.stringify({ to, type: 'text', content: text }),
      signal: AbortSignal.timeout(15_000),
    })
    return res.ok
  } catch {
    return false
  }
}

async function warmOneDevice(device: { id: string; userId: string; warmProgress: number }) {
  if (POOL_NUMBERS.length === 0) {
    console.warn(`[WarmDevice] WARM_POOL_NUMBERS not set — skipping device ${device.id}`)
    return
  }

  const day = progressToDay(device.warmProgress)
  const quota = quotaForDay(day)
  console.log(`[WarmDevice] device=${device.id} day~${day} quota=${quota}`)

  let sent = 0
  for (let i = 0; i < quota; i++) {
    const to = POOL_NUMBERS[Math.floor(Math.random() * POOL_NUMBERS.length)]!
    const text = WARM_TEXTS[Math.floor(Math.random() * WARM_TEXTS.length)]!

    const ok = await sendWarmMessage(device.id, to, text)
    if (ok) {
      sent++
      await db.insert(messages).values({
        userId: device.userId,
        deviceId: device.id,
        direction: 'outbound',
        toNumber: to,
        type: 'text',
        content: text,
        status: 'sent',
        sentAt: new Date(),
      })
    }

    // 3–5 s anti-spam spacing
    await sleep(randInt(3_000, 5_000))
  }

  // Increment progress: +1 day equivalent, capped at 100
  const increment = Math.ceil(100 / 30)
  const newProgress = Math.min(100, device.warmProgress + increment)
  await db
    .update(devices)
    .set({ warmProgress: newProgress, updatedAt: new Date() })
    .where(eq(devices.id, device.id))

  console.log(`[WarmDevice] device=${device.id} sent=${sent}/${quota} progress=${device.warmProgress}->${newProgress}`)
}

export function createWarmDeviceWorker() {
  return new Worker<WarmDeviceJobData>(
    QUEUE_NAMES.WARM_DEVICE,
    async (_job) => {
      // Sweep all eligible devices regardless of job payload
      const eligible = await db
        .select({ id: devices.id, userId: devices.userId, warmProgress: devices.warmProgress })
        .from(devices)
        .where(
          and(
            eq(devices.autoWarm, true),
            eq(devices.status, 'connected'),
            lt(devices.warmProgress, 100),
          ),
        )

      console.log(`[WarmDevice] sweep — ${eligible.length} eligible device(s)`)

      // Process devices sequentially to avoid hammering the worker
      for (const device of eligible) {
        await warmOneDevice(device)
      }
    },
    { connection: redisConn, concurrency: 1 },
  )
}
