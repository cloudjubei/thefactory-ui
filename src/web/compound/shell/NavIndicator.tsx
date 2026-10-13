import type { NavRowIndicator } from '../../../headless/utils/navIndicatorTypes'
import type { InkBadgeLook } from '../../../headless/utils/inkBadgeTypes'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { IconPause } from '../../icons'
import DotBadge from '../../primitives/DotBadge'
import InkBadge from './InkBadge'

export type NavIndicatorProps = {
  indicator: NavRowIndicator
  /** The user's per-category badge colours (`settings.notifications.badgeColors`). */
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  /** The user's badge look (`inkBadgeLook(settings.userPreferences)`). */
  look: InkBadgeLook
  /** Icon-rail mode: pinned to the row's top-right corner, shrunk. */
  collapsed?: boolean
}

const COLLAPSED_SCALE = 0.7

/**
 * The trailing indicator of a sidebar row — the web peer of the native
 * `NavIndicator` inside `NavDrawer`. Renders a resolved `NavRowIndicator`
 * verbatim; precedence lives in the headless resolver, never here.
 */
export default function NavIndicator({
  indicator,
  badgeColors,
  look,
  collapsed = false,
}: NavIndicatorProps) {
  const pin = collapsed ? 'absolute top-0 right-0 ' : ''
  switch (indicator.kind) {
    case 'ink':
      return (
        <span className={`${pin}inline-flex items-center justify-center`}>
          <InkBadge
            badge={indicator.badge}
            look={look}
            badgeColors={badgeColors}
            scale={collapsed ? COLLAPSED_SCALE : 1}
            label={indicator.title}
          />
        </span>
      )
    case 'paused':
      return (
        <span
          className={`${pin}inline-flex items-center justify-center text-blue-500`}
          title={indicator.title}
        >
          <IconPause className={collapsed ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </span>
      )
    case 'dot':
      return (
        <span
          className={`${pin}inline-flex items-center justify-center`}
          role="img"
          aria-label={indicator.title}
        >
          <DotBadge className="w-2 h-2" colorClass="bg-(--color-brand-600)" />
        </span>
      )
    case 'none':
      return null
  }
}
