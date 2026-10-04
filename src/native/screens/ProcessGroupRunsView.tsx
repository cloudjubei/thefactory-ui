import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  processGroupCardView,
  useProcessGroupRuns,
  type ProcessGroupRun,
  type ProcessNodeRunRef,
} from '../../headless'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import SegmentedControl from '../primitives/SegmentedControl'
import { useNativeTheme } from '../hooks/useNativeTheme'
import type { ChatContext } from '../../headless/api'

export type ProcessGroupRunsViewProps = {
  /** The group whose group runs to list. */
  groupId: string
  /** The group run currently open (for row highlight), from the route. */
  selectedGroupRunId?: string
  /** Select a group run — the host pushes its pipeline screen. */
  onSelectGroupRun: (groupRunId: string) => void
  /** Accepted for parity with the web peer; a project's pipeline is a pushed screen on mobile. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /** Accepted for parity with the web peer; the drill is a pushed pipeline screen on mobile. */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /** Accepted for parity with the web peer; the pushed pipeline screen takes its own `onOpenChat`. */
  onOpenChat?: (context: ChatContext) => void
  /** Accepted for parity; mobile is always single-pane (push-nav). */
  narrow?: boolean
}

type Mode = 'current' | 'history'

/**
 * Native peer of [web's `ProcessGroupRunsView`](../../web/screens/ProcessGroupRunsView.tsx).
 * A group's runs across its projects as a Current / History LIST. Mobile is
 * push-nav, so a row navigates to the group run's pipeline screen rather than
 * filling a detail pane.
 */
export default function ProcessGroupRunsView({
  groupId,
  selectedGroupRunId,
  onSelectGroupRun,
}: ProcessGroupRunsViewProps) {
  const { theme } = useNativeTheme()
  const { isLoaded, current, history } = useProcessGroupRuns(groupId)

  const selectedIsHistory = useMemo(
    () => history.some((r) => r.id === selectedGroupRunId),
    [history, selectedGroupRunId],
  )
  const [mode, setMode] = useState<Mode>(selectedIsHistory ? 'history' : 'current')
  useEffect(() => {
    if (selectedIsHistory) setMode('history')
  }, [selectedIsHistory])
  const rows = mode === 'current' ? current : history

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <View style={{ flex: 1 }}>
          <SegmentedControl
            size="sm"
            ariaLabel="Show current or finished group runs"
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'current', label: 'Current' },
              { value: 'history', label: 'History' },
            ]}
          />
        </View>
      </View>

      {!isLoaded ? (
        <Text style={{ padding: nativeSpace[3], fontSize: 12, color: theme.text.muted }}>
          Loading group runs…
        </Text>
      ) : rows.length === 0 ? (
        <Text style={{ padding: nativeSpace[3], fontSize: 12, color: theme.text.muted }}>
          {mode === 'current'
            ? 'No work is running across this group. Ask its chat to start some.'
            : 'No finished group runs yet.'}
        </Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: nativeSpace[2], gap: nativeSpace[1] }}>
          {rows.map((group) => (
            <GroupRunRow
              key={group.id}
              group={group}
              selected={group.id === selectedGroupRunId}
              onPress={() => onSelectGroupRun(group.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

function GroupRunRow({
  group,
  selected,
  onPress,
}: {
  group: ProcessGroupRun
  selected: boolean
  onPress: () => void
}) {
  const { theme, status } = useNativeTheme()
  const view = processGroupCardView(group)
  const variant = status[view.badge.tone]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        gap: nativeSpace[1],
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: selected ? theme.border.strong : 'transparent',
        backgroundColor: selected ? theme.surface.raised : 'transparent',
        paddingHorizontal: nativeSpace[2],
        paddingVertical: nativeSpace[2],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: variant.bg }} />
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 12.5, fontWeight: '500', color: theme.text.primary }}
        >
          {view.title}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: nativeSpace[2],
          paddingLeft: 16,
        }}
      >
        <View
          style={{
            borderRadius: nativeRadii.round,
            backgroundColor: variant.softBg,
            paddingHorizontal: 6,
            paddingVertical: 1,
          }}
        >
          <Text style={{ fontSize: 9.5, color: variant.softFg }}>{view.badge.label}</Text>
        </View>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 11, color: theme.text.secondary }}>
          {view.sub}
        </Text>
      </View>
    </Pressable>
  )
}
