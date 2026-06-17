'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { API_URL } from '../../../lib/config'
import { getToken } from '../../../lib/auth'
import { GoogleSignInButton } from '../../../components/GoogleSignInButton'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

function getStrength(p: string): { level: number; label: string; color: string } {
  if (p.length === 0) return { level: 0, label: '', color: '' }
  if (p.length < 6) return { level: 1, label: 'Weak', color: 'bg-danger' }
  if (p.length < 8 || !/[A-Z]/.test(p) || !/[0-9]/.test(p))
    return { level: 2, label: 'Fair', color: 'bg-warning' }
  if (p.length < 12 || !/[^A-Za-z0-9]/.test(p))
    return { level: 3, label: 'Good', color: 'bg-primary' }
  return { level: 4, label: 'Strong', color: 'bg-primary' }
}

export default function RegisterPage() {
  const router = useRouter()
  const { executeRecaptcha } = useGoogleReCaptcha()

  useEffect(() => {
    if (getToken()) router.replace('/devices')
  }, [router])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = getStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')

    const recaptchaToken = executeRecaptcha ? await executeRecaptcha('register') : undefined

    const res = await fetch(`${API_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, recaptchaToken }),
    })

    const json = await res.json() as { error?: { message: string } }
    setLoading(false)

    if (!res.ok) {
      setError(json.error?.message ?? 'Registration failed')
      return
    }

    router.push('/login')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: '#0A0F1E',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,214,143,0.06) 0%, transparent 60%)',
      }}
    >
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
          <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
          <p className="text-sm text-text-secondary mt-1">Start sending in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jane Smith"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
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
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="Min. 8 characters"
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
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.level ? strength.color : 'bg-surface-raised'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-text-muted">{strength.label}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                placeholder="Re-enter password"
                className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="mt-0.5 accent-primary"
            />
            <span className="text-xs text-text-secondary">
              I agree to the{' '}
              <a href="/terms" className="text-primary hover:text-primary-dark">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-primary hover:text-primary-dark">Privacy Policy</a>
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-background bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors"
            style={{ boxShadow: '0 0 20px rgba(0,214,143,0.3)' }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px" style={{ background: '#1E2D45' }} />
          </div>
          <GoogleSignInButton label="Sign up with Google" />
        </div>

        <p className="text-sm text-center mt-6 text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
