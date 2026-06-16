import { Hono } from 'hono'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { jwtAuth } from '../middleware/auth.js'

const ALLOWED: Record<string, { ext: string; category: string }> = {
  'image/jpeg':       { ext: 'jpg',  category: 'image' },
  'image/png':        { ext: 'png',  category: 'image' },
  'image/webp':       { ext: 'webp', category: 'image' },
  'video/mp4':        { ext: 'mp4',  category: 'video' },
  'audio/ogg':        { ext: 'ogg',  category: 'audio' },
  'audio/mpeg':       { ext: 'mp3',  category: 'audio' },
  'application/pdf':  { ext: 'pdf',  category: 'document' },
}

const MAX_BYTES = 16 * 1024 * 1024 // 16 MB

function getS3(): S3Client {
  const accountId = process.env['R2_ACCOUNT_ID'] ?? ''
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env['R2_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] ?? '',
    },
  })
}

export const uploadRoutes = new Hono()

uploadRoutes.use(jwtAuth)

uploadRoutes.post('/', async (c) => {
  if (!process.env['R2_ACCOUNT_ID']) {
    return c.json({ error: { code: 'NOT_CONFIGURED', message: 'File storage not configured' } }, 503)
  }

  const body = await c.req.parseBody()
  const raw = body['file']
  const file = raw instanceof File ? raw : null

  if (!file) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'Multipart field "file" is required' } }, 400)
  }

  const mime = file.type
  const meta = ALLOWED[mime]
  if (!meta) {
    return c.json({
      error: {
        code: 'INVALID_TYPE',
        message: `Unsupported file type "${mime}". Allowed: ${Object.keys(ALLOWED).join(', ')}`,
      },
    }, 422)
  }

  if (file.size > MAX_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE', message: `File exceeds the 16 MB limit (got ${(file.size / 1024 / 1024).toFixed(1)} MB)` } }, 422)
  }

  const key = `media/${randomUUID()}.${meta.ext}`
  const bytes = await file.arrayBuffer()

  await getS3().send(
    new PutObjectCommand({
      Bucket: process.env['R2_BUCKET_NAME'] ?? '',
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: mime,
    }),
  )

  const publicUrl = process.env['R2_PUBLIC_URL']?.replace(/\/$/, '') ?? ''
  const url = `${publicUrl}/${key}`

  const size = file.size

  return c.json({
    data: { url, mime, category: meta.category, size, key },
    message: 'Uploaded',
  }, 201)
})
