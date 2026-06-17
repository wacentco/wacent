import { Redis } from 'ioredis'

function parseRedisUrl(url: string) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: parseInt(u.port) || 6379,
    username: u.username || 'default',
    password: decodeURIComponent(u.password),
    tls: u.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
  }
}

const redisConfig = parseRedisUrl(process.env['REDIS_URL'] ?? 'redis://localhost:6379')

export const redis = new Redis({
  ...redisConfig,
  retryStrategy: (times: number) => {
    if (times > 3) return null
    return Math.min(times * 200, 1000)
  },
  enableOfflineQueue: false,
})

export const bullMQConnection = {
  ...redisConfig,
}
