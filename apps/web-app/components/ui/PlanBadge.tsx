type Plan = 'starter' | 'growth' | 'scale' | 'agency'

interface PlanBadgeProps {
  plan: string
}

const styles: Record<Plan, string> = {
  starter: 'bg-gray-800 text-gray-300 border-gray-700',
  growth: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  scale: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  agency: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const key = plan.toLowerCase() as Plan
  const style = styles[key] ?? styles.starter

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${style}`}>
      {plan}
    </span>
  )
}
