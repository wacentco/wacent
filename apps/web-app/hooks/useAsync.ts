import { useState, useCallback } from 'react'

export function useAsync<T>(fn: () => Promise<T>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return undefined
    } finally {
      setLoading(false)
    }
  }, [fn])

  return { run, loading, error }
}
