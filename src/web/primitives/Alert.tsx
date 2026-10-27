import type { ReactNode } from 'react'

import { IconClose } from '../icons'

export type AlertVariant = 'error' | 'info'

export type AlertProps = {
  variant?: AlertVariant
  children: ReactNode
  className?: string
  /** Shows a close button that puts the alert away. */
  onDismiss?: () => void
}

const VARIANT_STYLE: Record<AlertVariant, { background: string; color: string }> = {
  error: {
    background: 'var(--status-stuck-soft-bg)',
    color: 'var(--status-stuck-soft-fg)',
  },
  info: {
    background: 'var(--accent-soft-bg)',
    color: 'var(--accent-soft-fg)',
  },
}

export default function Alert({ variant = 'error', children, className, onDismiss }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`text-sm px-3 py-2 rounded ${onDismiss ? 'flex items-start gap-2' : ''} ${className ?? ''}`}
      style={VARIANT_STYLE[variant]}
    >
      {onDismiss ? <div className="flex-1 min-w-0">{children}</div> : children}
      {onDismiss ? (
        <button
          type="button"
          className="shrink-0 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
          title="Dismiss"
          onClick={onDismiss}
        >
          <IconClose className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  )
}
