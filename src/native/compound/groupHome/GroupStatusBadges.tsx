import type { GroupStatusBadge } from '../../../headless'
import ToneBadge from '../chips/ToneBadge'

export interface GroupStatusBadgesProps {
  badges: readonly GroupStatusBadge[]
}

/** What a group or a member has on. Native peer of web's `GroupStatusBadges`. */
export default function GroupStatusBadges({ badges }: GroupStatusBadgesProps) {
  return (
    <>
      {badges.map((badge) => (
        <ToneBadge key={badge.id} tone={badge.tone} label={badge.label} />
      ))}
    </>
  )
}
