import type { AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys'
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys'
import type { Redis } from 'ioredis'

const KEY_PREFIX = (deviceId: string) => `WACENT:auth:${deviceId}`

export async function useRedisAuthState(
  deviceId: string,
  redis: Redis,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  const prefix = KEY_PREFIX(deviceId)

  const credsRaw = await redis.get(`${prefix}:creds`)
  const creds: AuthenticationState['creds'] = credsRaw
    ? JSON.parse(credsRaw, BufferJSON.reviver)
    : initAuthCreds()

  const keys: AuthenticationState['keys'] = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {}
      await Promise.all(
        ids.map(async (id) => {
          const raw = await redis.get(`${prefix}:keys:${type}:${id}`)
          if (raw) result[id] = JSON.parse(raw, BufferJSON.reviver) as SignalDataTypeMap[T]
        }),
      )
      return result
    },
    set: async (data: { [key: string]: { [id: string]: unknown } }) => {
      const pipeline = redis.pipeline()
      for (const [type, ids] of Object.entries(data)) {
        for (const [id, value] of Object.entries(ids)) {
          if (value !== null && value !== undefined) {
            pipeline.set(`${prefix}:keys:${type}:${id}`, JSON.stringify(value, BufferJSON.replacer))
          } else {
            pipeline.del(`${prefix}:keys:${type}:${id}`)
          }
        }
      }
      await pipeline.exec()
    },
  }

  return {
    state: { creds, keys },
    saveCreds: async () => {
      await redis.set(`${prefix}:creds`, JSON.stringify(creds, BufferJSON.replacer))
    },
  }
}
