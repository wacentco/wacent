interface HealthBarProps {
  score: number
  label?: boolean
}

export function HealthBar({ score, label = true }: HealthBarProps) {
  const clampedScore = Math.max(0, Math.min(100, score))

  let gradient = 'from-primary to-primary'
  if (clampedScore < 50) gradient = 'from-danger to-orange-500'
  else if (clampedScore < 80) gradient = 'from-warning to-yellow-400'

  return (
    <div className="w-full space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-text-secondary">
          <span>Number Health</span>
          <span className={clampedScore < 50 ? 'text-danger' : clampedScore < 80 ? 'text-warning' : 'text-primary'}>
            {clampedScore}%
          </span>
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  )
}
