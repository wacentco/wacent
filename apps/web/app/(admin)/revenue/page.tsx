'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '../../../components/ui/StatCard'
import { API_URL } from '../../../lib/config'

interface Revenue {
  totalRevenue: number
  revenueByPlan: Record<string, number>
  mrr: number
}

export default function AdminRevenuePage() {
  const router = useRouter()
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [loading, setLoading] = useState(true)

  const getToken = useCallback(() => {
    const t = localStorage.getItem('wc_token')
    if (!t) router.push('/login')
    return t
  }, [router])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    void fetch(`${API_URL}/admin/revenue`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: { data: Revenue }) => {
        setRevenue(json.data)
        setLoading(false)
      })
  }, [getToken])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Revenue</h1>
        <p className="text-sm text-text-secondary mt-1">Monthly recurring revenue breakdown</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={DollarSign} metric={`$${((revenue?.mrr ?? 0) / 100).toFixed(2)}`} label="MRR" />
        <StatCard icon={TrendingUp} metric={`$${(((revenue?.mrr ?? 0) * 12) / 100).toFixed(2)}`} label="ARR (projected)" />
      </div>

      <div className="rounded-xl border p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}>
        <h2 className="text-sm font-semibold text-text-primary">Revenue by Plan</h2>
        {Object.entries(revenue?.revenueByPlan ?? {}).map(([plan, amount]) => (
          <div key={plan} className="flex items-center gap-4">
            <span className="text-sm capitalize text-text-secondary w-20">{plan}</span>
            <div className="flex-1 h-2 rounded-full bg-surface-raised overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, ((amount as number) / Math.max(1, revenue?.totalRevenue ?? 1)) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-text-primary w-16 text-right">
              ${((amount as number) / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
