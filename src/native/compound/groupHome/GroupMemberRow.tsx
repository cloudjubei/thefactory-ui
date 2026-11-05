import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { GROUP_STATUS_COPY, type GroupMemberView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import CheckChip from '../chips/CheckChip'
import { GroupMemberGitLine } from './GroupMemberCard'
import GroupStatusBadges from './GroupStatusBadges'

export interface GroupMemberRowProps {
  title: string
  icon: ReactNode
  member: GroupMemberView
  onSelect: () => void
}

/** A member as one row: web's table, laid out for a phone. A row opens the project. */
export default function GroupMemberRow({ title, icon, member, onSelect }: GroupMemberRowProps) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onSelect}
      style={({ pressed }) => ({
        gap: nativeSpace[2],
        paddingVertical: nativeSpace[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
        backgroundColor: pressed ? theme.surface.muted : 'transparent',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
        <View style={{ width: 22, alignItems: 'center' }}>{icon}</View>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {member.progress?.features ?? member.progress?.stories ?? GROUP_STATUS_COPY.noWork}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
        <GroupStatusBadges badges={member.badges} />
        {member.checks.map((check) => (
          <CheckChip key={check.id} row={check} inert />
        ))}
        <GroupMemberGitLine member={member} />
      </View>
    </Pressable>
  )
}
