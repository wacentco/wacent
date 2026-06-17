'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { API_URL } from '../../../lib/config'
import { getToken, getRole, setAuth } from '../../../lib/auth'
import { GoogleSignInButton } from '../../../components/GoogleSignInButton'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

export default function LoginPage() {
  const router = useRouter()
  const { executeRecaptcha } = useGoogleReCaptcha()

  useEffect(() => {
    if (getToken()) router.replace(getRole() === 'admin' ? '/admin' : '/devices')
  }, [router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const recaptchaToken = executeRecaptcha ? await executeRecaptcha('login') : undefined

    const res = await fetch(`${API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, recaptchaToken }),
    })

    const json = await res.json() as { data?: { token: string; user: { role: string } }; error?: { message: string } }
    setLoading(false)

    if (!res.ok || !json.data) {
      setError(json.error?.message ?? 'Login failed')
      return
    }

    setAuth(json.data.token, json.data.user.role)
    router.push(json.data.user.role === 'admin' ? '/admin' : '/devices')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: '#0A0F1E',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,214,143,0.06) 0%, transparent 60%)',
      }}
    >
      {/* Dot grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div
        className="relative w-full max-w-md rounded-2xl border p-8"
        style={{ background: 'rgba(17,24,39,0.8)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-background font-bold text-sm">W</span>
            </div>
            <span className="text-xl font-bold text-text-primary">Wacent</span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-text-secondary">Password</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:text-primary-dark">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-background bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors"
            style={{ boxShadow: '0 0 20px rgba(0,214,143,0.3)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-[11px] text-text-muted">
            Protected by reCAPTCHA —{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-secondary">Privacy</a>
            {' '}·{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-secondary">Terms</a>
          </p>
        </form>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
          </div>
          <GoogleSignInButton label="Continue with Google" />
        </div>

        <p className="text-sm text-center mt-6 text-text-secondary">
          No account?{' '}
          <Link href="/register" className="text-primary hover:text-primary-dark font-medium">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
