import { View } from 'react-native'

import type { GroupStoryMembership } from '../../../headless'
import { GroupStoryChip } from './GroupStoryBits'

export type PartOfGroupStoryChipProps = {
  memberships: readonly GroupStoryMembership[]
  onOpen: (groupId: string, groupStoryId: string) => void
}

/**
 * Native peer of web's `PartOfGroupStoryChip`: a part story's way back, in its
 * header — "Part of <group> › <group story>", opening the group story.
 */
export default function PartOfGroupStoryChip({ memberships, onOpen }: PartOfGroupStoryChipProps) {
  if (memberships.length === 0) return null
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {memberships.map((m) => (
        <GroupStoryChip
          key={`${m.groupId}/${m.groupStoryId}`}
          label={`Part of ${m.groupTitle} › ${m.title}`}
          tone="ok"
          accessibilityLabel={`Open the group story ${m.title} in ${m.groupTitle}`}
          onPress={() => onOpen(m.groupId, m.groupStoryId)}
        />
      ))}
    </View>
  )
}
