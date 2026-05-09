import type { ReactNode } from 'react'

export type AlertVariant = 'error' | 'info'

export type AlertProps = {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

const VARIANT_STYLE: Record<AlertVariant, { background: string; color: string }> = {
  error: {
    background: 'var(--color-red-50)',
    color: 'var(--color-red-700)',
  },
  info: {
    background: 'var(--color-blue-50)',
    color: 'var(--color-blue-700)',
  },
}

export default function Alert({ variant = 'error', children, className }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`text-sm px-3 py-2 rounded ${className ?? ''}`}
      style={VARIANT_STYLE[variant]}
    >
      {children}
    </div>
  )
}
