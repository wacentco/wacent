type Status = 'connected' | 'connecting' | 'disconnected' | 'banned'

interface StatusBadgeProps {
  status: Status
}

const config: Record<Status, { dot: string; label: string; pulse: boolean }> = {
  connected: { dot: 'bg-primary', label: 'Connected', pulse: false },
  connecting: { dot: 'bg-warning', label: 'Connecting', pulse: true },
  disconnected: { dot: 'bg-text-muted', label: 'Disconnected', pulse: false },
  banned: { dot: 'bg-danger', label: 'Banned', pulse: false },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { dot, label, pulse } = config[status] ?? config.disconnected

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`}>
        {pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-75`} />
        )}
      </span>
      {label}
    </span>
  )
}
