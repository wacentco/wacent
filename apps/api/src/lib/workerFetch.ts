const WORKER_URL = process.env['WORKER_URL'] ?? 'http://localhost:3001'
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

export async function workerFetch(path: string, body?: object, method = 'POST'): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': WORKER_SECRET },
    signal: controller.signal,
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(`${WORKER_URL}${path}`, init)
    return res
  } catch (err) {
    console.error(`Worker call failed for ${path}:`, err)
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function workerGet(path: string): Promise<Response> {
  return fetch(`${WORKER_URL}${path}`, {
    headers: { 'X-Worker-Secret': WORKER_SECRET },
  })
}
