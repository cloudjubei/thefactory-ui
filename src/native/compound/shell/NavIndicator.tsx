import { View } from 'react-native'
import { nativePalette } from '../../../tokens/native'
import type { NavRowIndicator } from '../../../headless/utils/navIndicatorTypes'
import type { InkBadgeLook } from '../../../headless/utils/inkBadgeTypes'
import { INK_FRESH_DOT_COLOR } from '../../../headless/utils/inkBadgeConstants'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { IconPause } from '../../icons'
import DotBadge from '../../primitives/DotBadge'
import InkBadge from './InkBadge'

export interface NavIndicatorProps {
  indicator: NavRowIndicator
  /** The user's per-category badge colours (`settings.notifications.badgeColors`). */
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  /** The user's badge look (`inkBadgeLook(settings.userPreferences)`). */
  look: InkBadgeLook
}

/**
 * The trailing indicator of a drawer row — the native peer of the web
 * `NavIndicator`. Renders a resolved `NavRowIndicator` verbatim; precedence
 * lives in the headless resolver, never here.
 */
export default function NavIndicator({ indicator, badgeColors, look }: NavIndicatorProps) {
  switch (indicator.kind) {
    case 'ink':
      return (
        <InkBadge
          badge={indicator.badge}
          look={look}
          badgeColors={badgeColors}
          label={indicator.title}
        />
      )
    case 'paused':
      return (
        <View accessible accessibilityLabel={indicator.title}>
          <IconPause size={14} color={nativePalette.brand[500]} />
        </View>
      )
    case 'dot':
      return (
        <View accessible accessibilityLabel={indicator.title} style={{ paddingHorizontal: 4 }}>
          <DotBadge size={8} color={INK_FRESH_DOT_COLOR} ringWidth={0} />
        </View>
      )
    case 'none':
      return null
  }
}
