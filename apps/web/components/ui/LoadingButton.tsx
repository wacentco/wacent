import { Loader2 } from 'lucide-react'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  variant?: 'primary' | 'danger' | 'ghost'
}

const variantClasses = {
  primary: 'bg-primary text-background hover:bg-primary-dark disabled:opacity-50',
  danger: 'text-danger hover:text-danger/80 disabled:opacity-50',
  ghost: 'text-text-secondary hover:text-text-primary disabled:opacity-50',
}

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled ?? loading}
      style={{ cursor: loading ? 'not-allowed' : 'pointer', ...props.style }}
      className={`flex items-center gap-2 transition-colors ${variantClasses[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}
