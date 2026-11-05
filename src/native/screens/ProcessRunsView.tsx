import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  formatBadgeCount,
  INK_FRESH_DOT_COLOR,
  PROCESS_RUN_FRESH_TITLE,
  PROCESS_RUN_WAITING_TITLE,
  processRunAttentionSections,
  processRunListRow,
  processRunSpend,
  processRunWaitingCount,
  processRunWorkLabel,
  useAppSettings,
  useDurationTimer,
  PROCESS_RUN_LIST_COPY,
  useProcessRunChatNews,
  useProcessRunListControls,
  useProcessRuns,
  useProcessStopClock,
  type BadgeColor,
  type ChatsSeenMap,
  type ProcessNodeRunRef,
  type ProcessRun,
  type ProcessRunAttentionSection,
  type ProcessRunChatNews,
} from '../../headless'
import DotBadge from '../primitives/DotBadge'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/Select'
import SegmentedControl from '../primitives/SegmentedControl'
import Spinner from '../primitives/Spinner'
import { DurCostChips } from '../compound/chat/signoff'
import CostChip from '../compound/chips/CostChip'
import NotificationBadge from '../compound/NotificationBadge'
import { IconSettings } from '../icons'
import { useNativeTheme } from '../hooks/useNativeTheme'
import type { ChatContext } from '../../headless/api'

export type ProcessRunsViewProps = {
  /**
   * The project the tab was opened on. The list can widen to every project or
   * to a group; a row then names its project, and selecting it passes that
   * project as the second argument.
   */
  projectId: string
  /** The run currently open (for row highlight), from the route. */
  selectedRunId?: string
  /** Select a run — the host pushes its pipeline screen. The second argument is the run's project. */
  onSelectRun: (runId: string, projectId: string) => void
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
  /** The chats the person has read, by chat key — what a run's own chat holds for them is read against it. */
  chatsSeen?: ChatsSeenMap
}

type Mode = 'current' | 'history'

/**
 * Native peer of [web's `ProcessRunsView`](../../web/screens/ProcessRunsView.tsx).
 * The Processes tab's run LIST — the blueprints moved to Settings → Processes
 * (the header cog), with filters for which projects, which story, which status
 * and which ending. Current is grouped by what each run needs — Needs you,
 * Sign off, Running, Merging — and its tab counts the runs waiting on the
 * person. Mobile is push-nav, so a row navigates to the pipeline screen rather
 * than filling a detail pane.
 */
export default function ProcessRunsView({
  projectId,
  selectedRunId,
  onSelectRun,
  onOpenSettings,
  chatsSeen,
}: ProcessRunsViewProps) {
  const { theme } = useNativeTheme()
  const controls = useProcessRunListControls(projectId)
  const { isLoaded, runs, current, history } = useProcessRuns(controls.request)
  const { settings } = useAppSettings()
  const badgeColor = settings.notifications.badgeColors.processes
  const stopNow = useProcessStopClock()
  const chatNews = useProcessRunChatNews(chatsSeen)
  const waiting = processRunWaitingCount(runs, stopNow, chatNews)
  const sections = useMemo(
    () => processRunAttentionSections(runs, stopNow, chatNews),
    [runs, stopNow, chatNews],
  )

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
  const showLoading = controls.scopePending || !isLoaded
  const listEmpty = mode === 'current' ? sections.length === 0 : rows.length === 0
  const projectNameOf = controls.showProject ? controls.projectName : undefined

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
      <View
        style={{
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingVertical: nativeSpace[2],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
        }}
      >
        <FilterSelect
          label={PROCESS_RUN_LIST_COPY.scope}
          value={controls.scope}
          onChange={controls.setScope}
          options={controls.scopeOptions}
        />
        <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
          <View style={{ flex: 1 }}>
            <FilterSelect
              label={PROCESS_RUN_LIST_COPY.story}
              value={controls.story}
              onChange={controls.setStory}
              options={controls.storyOptions}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FilterSelect
              label={PROCESS_RUN_LIST_COPY.status}
              value={controls.status}
              onChange={controls.setStatus}
              options={controls.statusOptions}
            />
          </View>
        </View>
        <FilterSelect
          label={PROCESS_RUN_LIST_COPY.ending}
          value={controls.ending}
          onChange={controls.setEnding}
          options={controls.endingOptions}
        />
      </View>

      {showLoading ? (
        <Text style={{ padding: nativeSpace[3], fontSize: 12, color: theme.text.muted }}>
          Loading runs…
        </Text>
      ) : listEmpty ? (
        <Text style={{ padding: nativeSpace[3], fontSize: 12, color: theme.text.muted }}>
          {controls.narrowed
            ? PROCESS_RUN_LIST_COPY.noMatch
            : mode === 'current'
              ? PROCESS_RUN_LIST_COPY.emptyCurrent
              : PROCESS_RUN_LIST_COPY.emptyHistory}
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
                  stopNow={stopNow}
                  chatNews={chatNews}
                  selectedRunId={selectedRunId}
                  onSelectRun={onSelectRun}
                  projectNameOf={projectNameOf}
                />
              ))
            : rows.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  now={now}
                  stopNow={stopNow}
                  chatNews={chatNews.get(run.id)}
                  projectName={projectNameOf?.(run.projectId)}
                  selected={run.id === selectedRunId}
                  onPress={() => onSelectRun(run.id, run.projectId)}
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
  stopNow,
  chatNews,
  selectedRunId,
  onSelectRun,
  projectNameOf,
}: {
  section: ProcessRunAttentionSection
  badgeColor: BadgeColor
  now: number
  /** The clock who has a stopped run's stop is read against. */
  stopNow: number
  /** What each run's own chat holds for the person, by run id. */
  chatNews: ReadonlyMap<string, ProcessRunChatNews>
  selectedRunId: string | undefined
  onSelectRun: (runId: string, projectId: string) => void
  projectNameOf?: (projectId: string) => string | undefined
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
          stopNow={stopNow}
          chatNews={chatNews.get(run.id)}
          projectName={projectNameOf?.(run.projectId)}
          selected={run.id === selectedRunId}
          onPress={() => onSelectRun(run.id, run.projectId)}
        />
      ))}
    </View>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) {
  const selected = options.find((option) => option.value === value)?.label
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" accessibilityLabel={selected ? `${label}, ${selected}` : label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RunRow({
  run,
  now,
  stopNow,
  chatNews,
  selected,
  projectName,
  onPress,
}: {
  run: ProcessRun
  /** The list's live clock — a running row's elapsed ticks against it. */
  now: number
  stopNow: number
  chatNews: ProcessRunChatNews | undefined
  selected: boolean
  /** Set when the list shows more than one project. */
  projectName?: string
  onPress: () => void
}) {
  const { theme, status } = useNativeTheme()
  const row = processRunListRow(run, stopNow, chatNews)
  const variant = status[row.tone]
  const spend = processRunSpend(run)
  const work = processRunWorkLabel(run, now)
  const label = projectName
    ? `${row.title} · ${projectName} · ${row.line}`
    : `${row.title} · ${row.line}`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
        {row.fresh ? (
          <View accessible accessibilityLabel={PROCESS_RUN_FRESH_TITLE}>
            <DotBadge size={8} color={INK_FRESH_DOT_COLOR} ringWidth={0} />
          </View>
        ) : null}
        <DurCostChips facts={{ durationLabel: work }} />
      </View>
      {projectName ? (
        <Text numberOfLines={1} style={{ paddingLeft: 16, fontSize: 11, color: theme.text.muted }}>
          {projectName}
        </Text>
      ) : null}
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
