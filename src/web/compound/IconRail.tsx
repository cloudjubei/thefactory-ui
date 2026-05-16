import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../utils/cn'
import Tooltip from '../primitives/Tooltip'

// Vertical 60 px-wide column of large icon buttons, used for screen-side action
// rails (Git operations, etc.). The container only handles the rail chrome —
// border, padding, scroll — and renders whatever children the consumer passes.

export type IconRailProps = {
  children: ReactNode
  width?: number
  className?: string
  style?: CSSProperties
}

export const ICON_RAIL_DEFAULT_WIDTH = 60

export function IconRail({
  children,
  width = ICON_RAIL_DEFAULT_WIDTH,
  className,
  style,
}: IconRailProps) {
  return (
    <div
      className={cn(
        'shrink-0 flex flex-col min-h-0 items-center py-2 overflow-x-hidden',
        'border-l border-(--border-subtle)',
        className,
      )}
      style={{ width, ...style }}
    >
      <div className="flex flex-col gap-2 items-center w-full px-2 overflow-y-auto overflow-x-hidden hide-scrollbar">
        {children}
      </div>
    </div>
  )
}

// A 52×52 rounded action button with an icon, a small text label, and an
// optional numeric badge. Wraps the button in a `Tooltip` when `tooltip` is
// provided.

export type IconRailButtonProps = {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  tooltip?: ReactNode
  badge?: number
}

export const IconRailButton = forwardRef<HTMLButtonElement, IconRailButtonProps>(
  function IconRailButton({ icon, label, onClick, disabled, tooltip, badge }, ref) {
    const btn = (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'w-[52px] h-[52px] shrink-0 rounded-xl border',
          'border-(--border-subtle) bg-(--surface-raised)',
          'hover:bg-(--surface-muted) active:scale-[0.98] transition',
          'flex flex-col items-center justify-center gap-1 relative',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-(--surface-raised)',
        )}
      >
        <div className="w-5 h-5 text-(--text-primary) flex items-center justify-center">{icon}</div>
        <div className="text-[10px] leading-3 text-(--text-secondary) text-center px-1">
          {label}
        </div>
        {badge !== undefined && badge > 0 && (
          <div className="absolute top-1 right-1 bg-(--color-brand-500) text-white text-[9px] font-bold px-1 py-0.5 rounded-md leading-none shadow-sm min-w-[16px] text-center">
            {badge}
          </div>
        )}
      </button>
    )
    return tooltip ? <Tooltip content={tooltip}>{btn}</Tooltip> : btn
  },
)
