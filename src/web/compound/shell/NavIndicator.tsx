import { formatBadgeCount } from '../../../headless/utils/badgeAggregation'
import { navBadgeLabel } from '../../../headless/utils/navIndicator'
import type { NavRowIndicator } from '../../../headless/utils/navIndicatorTypes'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { IconPause } from '../../icons'
import SpinnerWithDot from '../../primitives/SpinnerWithDot'
import NotificationBadge, { getNotificationBadgeColorClass } from '../NotificationBadge'

export type NavIndicatorProps = {
  indicator: NavRowIndicator
  /** The user's per-category badge colours (`settings.notifications.badgeColors`). */
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  /** Icon-rail mode: pinned to the row's top-right corner, shrunk. */
  collapsed?: boolean
}

/**
 * The trailing indicator of a sidebar row — the web peer of the native
 * `NavIndicator` inside `NavDrawer`. Renders a resolved `NavRowIndicator`
 * verbatim; precedence lives in the headless resolver, never here.
 */
export default function NavIndicator({
  indicator,
  badgeColors,
  collapsed = false,
}: NavIndicatorProps) {
  const pin = collapsed ? 'absolute top-1 right-1 ' : ''
  switch (indicator.kind) {
    case 'spinner': {
      const { dot } = indicator
      return (
        <span className={`${pin}inline-flex items-center justify-center`}>
          <SpinnerWithDot
            size={collapsed ? 12 : 14}
            showDot={!!dot}
            dotColorClass={
              dot ? getNotificationBadgeColorClass(badgeColors[dot.category]) : undefined
            }
            dotTitle={dot ? navBadgeLabel(dot) : undefined}
          />
        </span>
      )
    }
    case 'paused':
      return (
        <span
          className={`${pin}inline-flex items-center justify-center text-blue-500`}
          title="Paused activity — resumes when you open it"
        >
          <IconPause className={collapsed ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </span>
      )
    case 'badge':
      return (
        <NotificationBadge
          text={formatBadgeCount(indicator.count)}
          color={badgeColors[indicator.category]}
          className={collapsed ? `${pin}h-[14px] min-w-[14px] px-0.5 text-[8px]` : ''}
          tooltipLabel={navBadgeLabel(indicator)}
        />
      )
    case 'none':
      return null
  }
}
