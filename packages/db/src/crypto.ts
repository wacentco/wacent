import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey(): Buffer {
  const raw = process.env['SESSION_ENCRYPTION_KEY'] ?? ''
  return Buffer.from(createHash('sha256').update(raw).digest())
}

function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = (cipher as ReturnType<typeof createCipheriv> & { getAuthTag(): Buffer }).getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

function decrypt(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) return encrypted
  const [ivB64, tagB64, dataB64] = parts as [string, string, string]
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  ;(decipher as ReturnType<typeof createDecipheriv> & { setAuthTag(tag: Buffer): void }).setAuthTag(authTag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}

function tryEncrypt(value: string | null): string | null {
  if (!value) return value
  if (!process.env['SESSION_ENCRYPTION_KEY']) return value
  try { return encrypt(value) } catch { return value }
}

function tryDecrypt(value: string | null): string | null {
  if (!value) return value
  if (value.split(':').length !== 3) return value
  try { return decrypt(value) } catch { return value }
}

type DeviceRow = { sessionData: string | null }
type ContactRow = { phoneNumber: string; email: string | null }

export function encryptDevice<T extends DeviceRow>(device: T): T {
  return { ...device, sessionData: tryEncrypt(device.sessionData) }
}

export function decryptDevice<T extends DeviceRow>(device: T): T {
  return { ...device, sessionData: tryDecrypt(device.sessionData) }
}

export function encryptContact<T extends ContactRow>(contact: T): T {
  if (!process.env['SESSION_ENCRYPTION_KEY']) return contact
  return {
    ...contact,
    phoneNumber: encrypt(contact.phoneNumber),
    email: contact.email ? encrypt(contact.email) : null,
  }
}

export function decryptContact<T extends ContactRow>(contact: T): T {
  return {
    ...contact,
    phoneNumber: tryDecrypt(contact.phoneNumber) ?? contact.phoneNumber,
    email: tryDecrypt(contact.email),
  }
}
