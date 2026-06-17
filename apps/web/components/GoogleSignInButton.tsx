'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { API_URL } from '../lib/config'
import { setAuth } from '../lib/auth'
import { useRouter } from 'next/navigation'

export function GoogleSignInButton({ label = 'Continue with Google' }: { label?: string }) {
  const { data: session } = useSession()
  const router = useRouter()

  const idToken = (session as { googleIdToken?: string } | null)?.googleIdToken

  useEffect(() => {
    if (idToken) void exchangeToken(idToken)
  }, [idToken])

  async function exchangeToken(idToken: string) {
    const res = await fetch(`${API_URL}/v1/auth/google/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    const json = await res.json() as { data?: { token: string; user: { role: string } } }
    if (json.data) {
      setAuth(json.data.token, json.data.user.role)
      router.push(json.data.user.role === 'admin' ? '/admin' : '/devices')
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signIn('google')}
      className="w-full flex items-center justify-center gap-3 rounded-lg py-2.5 text-sm font-medium border transition-colors hover:bg-white/5"
      style={{ borderColor: '#1E2D45', color: '#F1F5F9' }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6149z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8064.54-1.8382.8591-3.0477.8591-2.3441 0-4.3282-1.5827-5.0364-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
        <path d="M3.9636 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9636 10.71z" fill="#FBBC05"/>
        <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582l3.0063 2.3318C4.6718 5.1623 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  )
}
