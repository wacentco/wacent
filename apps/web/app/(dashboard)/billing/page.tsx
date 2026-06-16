'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wz_token') ?? '' : ''
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

interface Subscription {
  planName: string | null
  priceMonthly: number | null
  priceYearly: number | null
  maxDevices: number | null
  subStatus: string | null
  currentPeriodEnd: string | null
}

const PLANS = [
  {
    name: 'Starter',
    price: '$2.90',
    priceYearly: '$29',
    devices: 1,
    features: ['1 WhatsApp number', 'Unlimited messages', 'REST API', 'Webhooks', 'Basic analytics'],
    stripePriceId: 'price_starter_monthly',
  },
  {
    name: 'Growth',
    price: '$7.90',
    priceYearly: '$79',
    devices: 3,
    features: ['3 WhatsApp numbers', 'Everything in Starter', 'Auto Warmer', 'Priority support'],
    stripePriceId: 'price_growth_monthly',
    highlight: true,
  },
  {
    name: 'Scale',
    price: '$19.90',
    priceYearly: '$199',
    devices: 10,
    features: ['10 WhatsApp numbers', 'Everything in Growth', 'Campaign Manager'],
    stripePriceId: 'price_scale_monthly',
  },
  {
    name: 'Agency',
    price: 'Custom',
    priceYearly: 'Custom',
    devices: 50,
    features: ['50+ numbers', 'Sub-accounts', 'Dedicated SLA', 'Custom onboarding'],
    stripePriceId: null,
  },
]

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      window.history.replaceState({}, '', '/billing')
    }
    void fetch(`${API}/v1/billing/subscription`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((json: { data: Subscription | null }) => {
        setSub(json.data)
        setLoading(false)
      })
  }, [])

  async function openPortal() {
    setRedirecting(true)
    const res = await fetch(`${API}/v1/billing/portal`, { method: 'POST', headers: authHeaders() })
    const json = await res.json() as { data: { url: string } }
    if (json.data?.url) window.location.href = json.data.url
    else setRedirecting(false)
  }

  async function checkout(priceId: string) {
    setRedirecting(true)
    const res = await fetch(`${API}/v1/billing/checkout`, {
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Flat pricing. No per-message fees. No surprises.</p>
        </div>
        {sub?.subStatus && (
          <button
            onClick={openPortal}
            disabled={redirecting}
            className="text-sm text-green-600 border border-green-600 px-4 py-2 rounded-lg hover:bg-green-50 disabled:opacity-50"
          >
            {redirecting ? 'Redirecting…' : 'Manage subscription'}
          </button>
        )}
      </div>

      {!loading && sub?.planName && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm">
          <p className="font-medium text-green-800">
            Current plan: <span className="capitalize">{sub.planName}</span>
            {sub.subStatus && ` — ${sub.subStatus}`}
          </p>
          {sub.currentPeriodEnd && (
            <p className="text-green-700 mt-0.5">
              Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.name.toLowerCase()
          return (
            <div
              key={plan.name}
              className={`bg-white rounded-xl border p-5 flex flex-col ${plan.highlight ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.highlight && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full self-start mb-3 font-medium">
                  Most popular
                </span>
              )}
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <div className="mt-1 mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-gray-500 text-sm">/mo</span>}
                {plan.price !== 'Custom' && (
                  <p className="text-xs text-gray-400 mt-0.5">or {plan.priceYearly}/yr</p>
                )}
              </div>
              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-gray-600 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="text-center text-sm text-green-600 font-medium py-2">Current plan</span>
              ) : plan.stripePriceId ? (
                <button
                  onClick={() => checkout(plan.stripePriceId!)}
                  disabled={redirecting}
                  className={`text-sm font-medium py-2 rounded-lg disabled:opacity-50 ${
                    plan.highlight
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {redirecting ? 'Redirecting…' : 'Get started'}
                </button>
              ) : (
                <a
                  href="mailto:hello@wazap.sh?subject=Agency Plan"
                  className="text-center text-sm font-medium py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Contact us
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
