import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { GROUP_MEMBER_RUNS_SHOWN, GROUP_STATUS_COPY, type GroupMemberView } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { BranchChip } from '../BranchChip'
import CheckChip from '../chips/CheckChip'
import GroupStatusBadges from './GroupStatusBadges'

export interface GroupMemberCardProps {
  title: string
  icon: ReactNode
  member: GroupMemberView
  onSelect: () => void
  onSelectRun?: (runId: string, projectId: string) => void
}

/** A bar of how much of a member's work is done. */
export function GroupMemberProgressBar({ percent }: { percent: number }) {
  const { theme, status } = useNativeTheme()
  return (
    <View
      style={{
        height: 4,
        borderRadius: nativeRadii[1],
        overflow: 'hidden',
        backgroundColor: theme.surface.muted,
      }}
    >
      <View style={{ height: 4, width: `${percent}%`, backgroundColor: status.done.bg }} />
    </View>
  )
}

/** A member's checkout in a line. Native peer of web's `GroupMemberGitLine`. */
export function GroupMemberGitLine({ member }: { member: GroupMemberView }) {
  const { theme } = useNativeTheme()
  const { git } = member
  if (!git) return null
  if (git.unread) return <Text style={{ fontSize: 11, color: theme.text.muted }}>{git.unread}</Text>
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
      <BranchChip type="current" label={git.branch ?? ''} />
      {git.divergence ? (
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{git.divergence}</Text>
      ) : null}
    </View>
  )
}

/**
 * One member at a glance. Native peer of web's `GroupMemberCard`: the card
 * opens the project, a run listed on it opens that run.
 */
export default function GroupMemberCard({
  title,
  icon,
  member,
  onSelect,
  onSelectRun,
}: GroupMemberCardProps) {
  const { theme, status } = useNativeTheme()
  const shown = member.runs.slice(0, GROUP_MEMBER_RUNS_SHOWN)
  const more = member.runs.length - shown.length
  const hasChips = member.badges.length > 0 || member.checks.length > 0
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onSelect}
      style={({ pressed }) => ({
        gap: nativeSpace[3],
        padding: nativeSpace[6],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor:
          member.attention === 'needs-you' ? status.on_hold.softBorder : theme.border.subtle,
        backgroundColor: pressed ? theme.surface.muted : theme.surface.raised,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[4] }}>
        <View style={{ width: 24, alignItems: 'center' }}>{icon}</View>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary }}
        >
          {title}
        </Text>
      </View>
      {hasChips ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
          <GroupStatusBadges badges={member.badges} />
          {member.checks.map((check) => (
            <CheckChip key={check.id} row={check} inert />
          ))}
        </View>
      ) : null}
      {member.progress ? (
        <View style={{ gap: nativeSpace[1] }}>
          <GroupMemberProgressBar percent={member.progress.percent} />
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>
            {[member.progress.stories, member.progress.features].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>{GROUP_STATUS_COPY.noWork}</Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[2],
        }}
      >
        <GroupMemberGitLine member={member} />
        {member.activity ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{member.activity}</Text>
        ) : null}
      </View>
      {shown.map((run) => (
        <Pressable
          key={run.id}
          accessibilityRole="button"
          accessibilityLabel={`${run.title} · ${run.line}`}
          onPress={() => onSelectRun?.(run.id, run.projectId)}
          style={{ gap: 1 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: status[run.tone].bg,
              }}
            />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.text.primary }}>
              {run.title}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{ paddingLeft: 14, fontSize: 11, color: theme.text.secondary }}
          >
            {run.line}
          </Text>
        </Pressable>
      ))}
      {more > 0 ? (
        <Text style={{ fontSize: 11, color: theme.text.muted }}>
          {GROUP_STATUS_COPY.moreRuns(more)}
        </Text>
      ) : null}
    </Pressable>
  )
}
