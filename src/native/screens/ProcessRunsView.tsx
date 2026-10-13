import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  formatBadgeCount,
  PROCESS_RUN_WAITING_TITLE,
  processRunAttentionSections,
  processRunListRow,
  processRunSpend,
  processRunWaitingCount,
  processRunWorkLabel,
  useAppSettings,
  useDurationTimer,
  useProcessRuns,
  type BadgeColor,
  type ProcessNodeRunRef,
  type ProcessRun,
  type ProcessRunAttentionSection,
} from '../../headless'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import SegmentedControl from '../primitives/SegmentedControl'
import Spinner from '../primitives/Spinner'
import { DurCostChips } from '../compound/chat/signoff'
import CostChip from '../compound/chips/CostChip'
import NotificationBadge from '../compound/NotificationBadge'
import { IconSettings } from '../icons'
import { useNativeTheme } from '../hooks/useNativeTheme'
import type { ChatContext } from '../../headless/api'

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
  /** Accepted for parity with the web peer; the drill is a pushed pipeline screen on mobile. */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /** Accepted for parity with the web peer; the pushed pipeline screen takes its own `onOpenChat`. */
  onOpenChat?: (context: ChatContext) => void
  /** Accepted for parity; mobile is always single-pane (push-nav). */
  narrow?: boolean
}

type Mode = 'current' | 'history'

/**
 * Native peer of [web's `ProcessRunsView`](../../web/screens/ProcessRunsView.tsx).
 * The Processes tab's run LIST — the blueprints moved to Settings → Processes
 * (the header cog). Current is grouped by what each run needs — Needs you,
 * Sign off, Running, Merging — and its tab counts the runs waiting on the
 * person. Mobile is push-nav, so a row navigates to the pipeline screen rather
 * than filling a detail pane.
 */
export default function ProcessRunsView({
  projectId,
  selectedRunId,
  onSelectRun,
  onOpenSettings,
}: ProcessRunsViewProps) {
  const { theme } = useNativeTheme()
  const { isLoaded, current, history } = useProcessRuns(projectId)
  const { settings } = useAppSettings()
  const badgeColor = settings.notifications.badgeColors.processes
  const waiting = processRunWaitingCount(current)
  const sections = useMemo(() => processRunAttentionSections(current), [current])

  const selectedIsHistory = useMemo(
    () => history.some((r) => r.id === selectedRunId),
    [history, selectedRunId],
  )
  const [mode, setMode] = useState<Mode>(selectedIsHistory ? 'history' : 'current')
  useEffect(() => {
    if (selectedIsHistory) setMode('history')
  }, [selectedIsHistory])
  const rows = mode === 'current' ? current : history
  // One clock for the list — ticks while any run has a step working, so its
  // row's time advances; every other row is fixed at its ledger total.
  const now = useDurationTimer(current.some((r) => r.totals?.ticking === true))

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
              {
                value: 'current',
                label: 'Current',
                ...(waiting > 0
                  ? {
                      badge: (
                        <NotificationBadge
                          text={formatBadgeCount(waiting)}
                          color={badgeColor}
                          tooltipLabel={PROCESS_RUN_WAITING_TITLE(waiting)}
                          style={{ height: 16, minWidth: 16, paddingHorizontal: 4, borderWidth: 0 }}
                        />
                      ),
                    }
                  : {}),
              },
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
          {mode === 'current'
            ? sections.map((section) => (
                <RunSection
                  key={section.id}
                  section={section}
                  badgeColor={badgeColor}
                  now={now}
                  selectedRunId={selectedRunId}
                  onSelectRun={onSelectRun}
                />
              ))
            : rows.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  now={now}
                  selected={run.id === selectedRunId}
                  onPress={() => onSelectRun(run.id)}
                />
              ))}
        </ScrollView>
      )}
    </View>
  )
}

function RunSection({
  section,
  badgeColor,
  now,
  selectedRunId,
  onSelectRun,
}: {
  section: ProcessRunAttentionSection
  badgeColor: BadgeColor
  now: number
  selectedRunId: string | undefined
  onSelectRun: (runId: string) => void
}) {
  const { status } = useNativeTheme()
  const fg = status[section.tone].softFg
  const count = section.runs.length
  return (
    <View accessibilityLabel={section.label} style={{ gap: 2, marginBottom: nativeSpace[1] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[2],
          paddingTop: nativeSpace[1],
        }}
      >
        <Text style={{ flex: 1, fontSize: 11.5, fontWeight: '600', color: fg }}>
          {section.label}
        </Text>
        {section.counted ? (
          <NotificationBadge
            text={formatBadgeCount(count)}
            color={badgeColor}
            tooltipLabel={PROCESS_RUN_WAITING_TITLE(count)}
            style={{ height: 16, minWidth: 16, paddingHorizontal: 4, borderWidth: 0 }}
          />
        ) : (
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: fg }}>{count}</Text>
        )}
      </View>
      {section.runs.map((run) => (
        <RunRow
          key={run.id}
          run={run}
          now={now}
          selected={run.id === selectedRunId}
          onPress={() => onSelectRun(run.id)}
        />
      ))}
    </View>
  )
}

function RunRow({
  run,
  now,
  selected,
  onPress,
}: {
  run: ProcessRun
  /** The list's live clock — a running row's elapsed ticks against it. */
  now: number
  selected: boolean
  onPress: () => void
}) {
  const { theme, status } = useNativeTheme()
  const row = processRunListRow(run)
  const variant = status[row.tone]
  const spend = processRunSpend(run)
  const work = processRunWorkLabel(run, now)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title} · ${row.line}`}
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
          {row.title}
        </Text>
        {row.live ? <Spinner size={12} color={variant.bg} /> : null}
        <DurCostChips facts={{ durationLabel: work }} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingLeft: 16,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 11.5,
            fontWeight: row.asks ? '600' : '400',
            color: row.asks ? variant.softFg : theme.text.secondary,
          }}
        >
          {row.line}
        </Text>
        {spend ? <CostChip label={spend.label} cost={run.totals} title={spend.title} /> : null}
      </View>
    </Pressable>
  )
}
