import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  metric: string | number
  label: string
  trend?: string
  trendUp?: boolean
}

export function StatCard({ icon: Icon, metric, label, trend, trendUp }: StatCardProps) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg" style={{ background: 'rgba(0,214,143,0.1)' }}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? 'text-primary' : 'text-danger'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-text-primary">{metric}</div>
        <div className="text-sm text-text-secondary mt-0.5">{label}</div>
      </div>
    </div>
  )
}
