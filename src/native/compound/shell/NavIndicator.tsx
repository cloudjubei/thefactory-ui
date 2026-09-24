import { nativePalette } from '../../../tokens/native'
import { formatBadgeCount } from '../../../headless/utils/badgeAggregation'
import { navBadgeLabel } from '../../../headless/utils/navIndicator'
import type { NavRowIndicator } from '../../../headless/utils/navIndicatorTypes'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconPause } from '../../icons'
import SpinnerWithDot from '../../primitives/SpinnerWithDot'
import NotificationBadge, { getNotificationBadgeColor } from '../NotificationBadge'

export interface NavIndicatorProps {
  indicator: NavRowIndicator
  /** The user's per-category badge colours (`settings.notifications.badgeColors`). */
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
}

/**
 * The trailing indicator of a drawer row — the native peer of the web
 * `NavIndicator`. Renders a resolved `NavRowIndicator` verbatim; precedence
 * lives in the headless resolver, never here.
 */
export default function NavIndicator({ indicator, badgeColors }: NavIndicatorProps) {
  const { status } = useNativeTheme()
  switch (indicator.kind) {
    case 'spinner': {
      const { dot } = indicator
      return (
        <SpinnerWithDot
          size={14}
          showDot={!!dot}
          dotColor={
            dot ? getNotificationBadgeColor(badgeColors[dot.category], false, status) : undefined
          }
        />
      )
    }
    case 'paused':
      return <IconPause size={14} color={nativePalette.brand[500]} />
    case 'badge':
      return (
        <NotificationBadge
          text={formatBadgeCount(indicator.count)}
          color={badgeColors[indicator.category]}
          tooltipLabel={navBadgeLabel(indicator)}
        />
      )
    case 'none':
      return null
  }
}
