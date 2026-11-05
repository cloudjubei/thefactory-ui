import type { GroupStatusBadge } from '../../../headless'
import ToneBadge from '../chips/ToneBadge'

export type GroupStatusBadgesProps = {
  badges: readonly GroupStatusBadge[]
}

/** What a group or a member has on, as soft status pills. */
export default function GroupStatusBadges({ badges }: GroupStatusBadgesProps) {
  return (
    <>
      {badges.map((badge) => (
        <ToneBadge
          key={badge.id}
          tone={badge.tone}
          {...(badge.title ? { title: badge.title } : {})}
        >
          {badge.label}
        </ToneBadge>
      ))}
    </>
  )
}
