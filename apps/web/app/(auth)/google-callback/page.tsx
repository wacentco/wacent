'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { API_URL } from '../../../lib/config'
import { setAuth } from '../../../lib/auth'

export default function GoogleCallbackPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const idToken = (session as { googleIdToken?: string } | null)?.googleIdToken

  useEffect(() => {
    if (status === 'loading') return
    if (!idToken) { router.replace('/login'); return }

    void fetch(`${API_URL}/v1/auth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
      .then((r) => r.json())
      .then((json: { data?: { token: string; user: { role: string } } }) => {
        if (json.data) {
          setAuth(json.data.token, json.data.user.role)
          router.replace('/devices') // proxy handles admin redirect
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
  }, [idToken, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#00D68F] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#94A3B8]">Signing in with Google…</p>
      </div>
    </div>
  )
}
