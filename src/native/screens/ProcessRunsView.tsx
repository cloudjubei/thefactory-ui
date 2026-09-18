import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  formatProcessDuration,
  processRunCardView,
  useProcessRuns,
  type ProcessNodeRunRef,
  type ProcessRun,
} from '../../headless'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import SegmentedControl from '../primitives/SegmentedControl'
import { IconSettings } from '../icons'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type ProcessRunsViewProps = {
  /** The project whose runs to list. */
  projectId: string
  /** The run currently open (for row highlight), from the route. */
  selectedRunId?: string
  /** Select a run — the host pushes its pipeline screen. */
  onSelectRun: (runId: string) => void
  /** Open the process blueprints (Settings → Processes). The header cog. */
  onOpenSettings: () => void
  /** Accepted for parity with the web peer; the pipeline detail is a pushed screen on mobile. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /** Accepted for parity; mobile is always single-pane (push-nav). */
  narrow?: boolean
}

type Mode = 'current' | 'history'

/**
 * Native peer of [web's `ProcessRunsView`](../../web/screens/ProcessRunsView.tsx).
 * The Processes tab's run LIST — the blueprints moved to Settings → Processes
 * (the header cog). Mobile is push-nav, so a row navigates to the pipeline
 * screen rather than filling a detail pane.
 */
export default function ProcessRunsView({
  projectId,
  selectedRunId,
  onSelectRun,
  onOpenSettings,
}: ProcessRunsViewProps) {
  const { theme } = useNativeTheme()
  const { isLoaded, current, history } = useProcessRuns(projectId)

  const selectedIsHistory = useMemo(
    () => history.some((r) => r.id === selectedRunId),
    [history, selectedRunId],
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
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'current', label: 'Current' },
              { value: 'history', label: 'History' },
            ]}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Process blueprints"
          onPress={onOpenSettings}
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: nativeRadii[2],
            borderWidth: 1,
            borderColor: theme.border.default,
            backgroundColor: theme.surface.raised,
          }}
        >
          <IconSettings size={16} color={theme.text.secondary} />
        </Pressable>
      </View>

      {!isLoaded ? (
        <Text style={{ padding: nativeSpace[3], fontSize: 12, color: theme.text.muted }}>
          Loading runs…
        </Text>
      ) : rows.length === 0 ? (
        <Text style={{ padding: nativeSpace[3], fontSize: 12, color: theme.text.muted }}>
          {mode === 'current'
            ? 'No processes are running. Start work on a story from its chat.'
            : 'No finished processes yet.'}
        </Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: nativeSpace[2], gap: nativeSpace[1] }}>
          {rows.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              selected={run.id === selectedRunId}
              onPress={() => onSelectRun(run.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

function RunRow({
  run,
  selected,
  onPress,
}: {
  run: ProcessRun
  selected: boolean
  onPress: () => void
}) {
  const { theme, status } = useNativeTheme()
  const view = processRunCardView(run)
  const variant = status[view.badge.tone]
  const durMs = Math.max(0, run.updatedAt - run.startedAt - (run.parkedMs ?? 0))
  return (
    <Pressable
      accessibilityRole="button"
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
        <Text style={{ fontSize: 10, color: theme.text.muted }}>
          {formatProcessDuration(durMs)}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
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
