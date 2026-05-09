// iOS-style notification badge — round for single digits, pill for two+,
// always high-contrast with a ring so it pops on any surface.

export type NotificationBadgeColor = 'red' | 'blue' | 'green' | 'orange'

export interface NotificationBadgeProps {
  text: string
  tooltipLabel?: string
  // When true and `color` is unset, defaults to blue (informative) instead of red (alert).
  isInformative?: boolean
  // Explicit colour override. Falls back to red, or blue when `isInformative`.
  color?: NotificationBadgeColor
  // Escape hatch for callers that want to drive the background via an
  // arbitrary class (e.g. a CSS variable). Wins over `color`.
  colorClass?: string
  className?: string
}

const COLOR_CLASS: Record<NotificationBadgeColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
}

export function getNotificationBadgeColorClass(
  color: NotificationBadgeColor | undefined,
  isInformative: boolean = false,
): string {
  if (color) return COLOR_CLASS[color]
  return isInformative ? COLOR_CLASS.blue : COLOR_CLASS.red
}

export default function NotificationBadge({
  text,
  tooltipLabel,
  isInformative = false,
  color,
  colorClass,
  className = '',
}: NotificationBadgeProps) {
  const bg = colorClass || getNotificationBadgeColorClass(color, isInformative)
  const title = tooltipLabel || text

  return (
    <span
      className={[
        'inline-flex items-center justify-center select-none',
        'h-5 min-w-5 px-1.5',
        'rounded-full',
        'text-[11px] font-semibold text-white',
        bg,
        'ring-2 ring-white dark:ring-neutral-900',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={title}
      aria-label={title}
    >
      {text}
    </span>
  )
}
