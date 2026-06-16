'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, CreditCard } from 'lucide-react'
import { PlanBadge } from '../../../components/ui/PlanBadge'
import { API_URL, CONTACT_EMAIL } from '../../../lib/config'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wc_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

interface Subscription {
  planName: string | null
  priceMonthly: number | null
  subStatus: string | null
  currentPeriodEnd: string | null
}

const PLANS = [
  {
    name: 'Starter',
    priceMonthly: 590,
    priceYearly: 4900,
    devices: 1,
    features: ['1 WhatsApp number', 'Unlimited messages', 'REST API', '1 webhook', 'Basic analytics', 'Email support'],
    stripePriceId: 'price_starter_monthly',
  },
  {
    name: 'Growth',
    priceMonthly: 1490,
    priceYearly: 12400,
    devices: 5,
    features: ['5 WhatsApp numbers', 'Everything in Starter', 'Auto Warmer', 'Contact manager', 'CSV import', 'Priority email support'],
    stripePriceId: 'price_growth_monthly',
    highlight: true,
  },
  {
    name: 'Scale',
    priceMonthly: 3490,
    priceYearly: 29000,
    devices: 15,
    features: ['15 WhatsApp numbers', 'Everything in Growth', 'Campaign Manager', '10 webhooks', '99.9% SLA'],
    stripePriceId: 'price_scale_monthly',
  },
  {
    name: 'Agency',
    priceMonthly: 8900,
    priceYearly: 74000,
    devices: 50,
    features: ['50+ numbers', 'Everything in Scale', 'Unlimited webhooks', 'Dedicated support', 'Custom onboarding'],
    stripePriceId: null,
  },
]

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [yearly, setYearly] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    void fetch(`${API_URL}/v1/billing/subscription`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((json: { data: Subscription | null }) => {
        setSub(json.data)
        setLoading(false)
      })
  }, [])

  async function openPortal() {
    setRedirecting(true)
    const res = await fetch(`${API_URL}/v1/billing/portal`, { method: 'POST', headers: authHeaders() })
    const json = await res.json() as { data: { url: string } }
    if (json.data?.url) window.location.href = json.data.url
    else setRedirecting(false)
  }

  async function checkout(priceId: string) {
    setRedirecting(true)
    const res = await fetch(`${API_URL}/v1/billing/checkout`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ priceId }),
    })
    const json = await res.json() as { data: { url: string } }
    if (json.data?.url) window.location.href = json.data.url
    else setRedirecting(false)
  }

  const currentPlan = sub?.planName?.toLowerCase() ?? null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
        <p className="text-sm text-text-secondary mt-1">Flat pricing. No per-message fees. No surprises.</p>
      </div>

      {!loading && sub?.planName && (
        <div className="rounded-xl border p-5 flex items-center justify-between" style={{ background: 'rgba(0,214,143,0.06)', borderColor: 'rgba(0,214,143,0.2)' }}>
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">Current plan:</span>
                <PlanBadge plan={sub.planName} />
                {sub.subStatus && (
                  <span className="text-xs text-text-muted capitalize">· {sub.subStatus}</span>
                )}
              </div>
              {sub.currentPeriodEnd && (
                <p className="text-xs text-text-secondary mt-0.5">
                  Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={openPortal}
            disabled={redirecting}
            className="text-sm font-medium text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/10 disabled:opacity-50 transition-colors"
          >
            {redirecting ? 'Redirecting…' : 'Manage subscription'}
          </button>
        </div>
      )}

      {/* Monthly / Yearly toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${!yearly ? 'text-text-primary' : 'text-text-muted'}`}>Monthly</span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${yearly ? 'bg-primary' : 'bg-surface-raised border border-border'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${yearly ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm ${yearly ? 'text-text-primary' : 'text-text-muted'}`}>
          Yearly <span className="text-xs text-primary font-medium">Save ~31%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.name.toLowerCase()
          const price = yearly ? plan.priceYearly : plan.priceMonthly
          const displayPrice = `$${(price / 100).toFixed(2)}`

          return (
            <div
              key={plan.name}
              className={`rounded-xl border p-5 flex flex-col transition-all ${
                plan.highlight
                  ? 'border-primary/50'
                  : 'border-border'
              }`}
              style={{ background: plan.highlight ? 'rgba(0,214,143,0.04)' : 'rgba(255,255,255,0.02)' }}
            >
              {plan.highlight && (
                <span className="inline-block text-xs bg-primary text-background px-2 py-0.5 rounded-full self-start mb-3 font-semibold">
                  Most popular
                </span>
              )}
              <PlanBadge plan={plan.name} />
              <div className="mt-3 mb-4">
                <span className="text-3xl font-bold text-text-primary">{displayPrice}</span>
                <span className="text-text-muted text-sm">/{yearly ? 'yr' : 'mo'}</span>
                <p className="text-xs text-text-muted mt-0.5">{plan.devices} device{plan.devices !== 1 ? 's' : ''}</p>
              </div>
              <ul className="space-y-2 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-text-secondary flex items-start gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="text-center text-sm text-primary font-medium py-2">Current plan</div>
              ) : plan.stripePriceId ? (
                <button
                  onClick={() => void checkout(plan.stripePriceId!)}
                  disabled={redirecting}
                  className={`text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors ${
                    plan.highlight
                      ? 'bg-primary text-background hover:bg-primary-dark'
                      : 'border border-border text-text-secondary hover:border-primary hover:text-primary'
                  }`}
                >
                  {redirecting ? 'Redirecting…' : 'Upgrade'}
                </button>
              ) : (
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Agency Plan`}
                  className="text-center text-sm font-semibold py-2 rounded-lg border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors"
                >
                  Contact sales
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
