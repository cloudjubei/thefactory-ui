import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  formatBadgeCount,
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
  type ProcessNodeRunRef,
  type RunModelChipSlot,
  type ProcessRun,
  type ProcessRunAttentionSection,
  type ProcessRunChatNews,
  type ProcessStatusTone,
} from '../../headless'
import DotBadge from '../primitives/DotBadge'
import { useChatsSeen } from '../compound/notifications/chatsSeen'
import { NativeSelect } from '../primitives/NativeSelect'
import SegmentedControl from '../primitives/SegmentedControl'
import Spinner from '../primitives/Spinner'
import Tooltip from '../primitives/Tooltip'
import { IconSettings, IconWorkflow } from '../icons'
import CostChip from '../compound/chips/CostChip'
import NotificationBadge from '../compound/NotificationBadge'
import { DURATION_CHIP_CLASS } from '../compound/chat/ToolCall/StatusIcon'
import ProcessPipeline from '../compound/process/ProcessPipeline'
import type { ChatContext } from '../../headless/api'

export type ProcessRunsViewProps = {
  /**
   * The project the tab was opened on. The list can widen to every project or
   * to a group; a row then names its project, and selecting it passes that
   * project as the second argument.
   */
  projectId: string
  /** The run whose pipeline fills the detail pane, from the route. */
  selectedRunId?: string
  /** Select a run — the host navigates to its pipeline route. The second argument is the run's project. */
  onSelectRun: (runId: string, projectId: string) => void
  /** Open the process blueprints (Settings → Processes). The header cog. */
  onOpenSettings: () => void
  /** A leaf hands off to its agent-run chat — threaded to the pipeline. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /**
   * Render a leaf's agent-run chat inside the pipeline (drill-down) rather than
   * routing away — threaded to the pipeline, where it wins over `onOpenAgentRun`.
   */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /** Open a chat by its context — where a waiting agent's ask was handed. Threaded to the pipeline. */
  onOpenChat?: (context: ChatContext) => void
  /** Render a run's own chat in the sidebar docked beside the run. Threaded to the pipeline. */
  renderChat?: (context: ChatContext, onClose: () => void) => ReactNode
  /** Open the group run a selected run is a leg of. Threaded to the pipeline. */
  onOpenGroupRun?: (groupRunId: string) => void
  /** Render the host's chooser chip for a run's model. Threaded to the pipeline. */
  renderModelChip?: (slot: RunModelChipSlot) => ReactNode
  /**
   * Collapse to one pane at a time (small screens): the list, or the detail when
   * a run is selected. A big-screen host omits it and keeps both panes.
   */
  narrow?: boolean
}

type Mode = 'current' | 'history'

/**
 * The Processes tab: the process RUNS (not the blueprints — those moved to
 * Settings → Processes, reached by the header cog). An inner sidebar lists the
 * runs with a Current / History toggle, mirroring the chat sidebar, and filters
 * for which projects, which story, which status and which ending. Current is
 * grouped by what each run needs — Needs you, Sign off, Running, Merging — and
 * its tab counts the runs waiting on the person; each row says in one line
 * what its run needs. Selecting one shows its pipeline in the detail pane — the
 * same pipeline the chat card opens, so there is one place a run is watched,
 * and the only place it is decided.
 */
export default function ProcessRunsView({
  projectId,
  selectedRunId,
  onSelectRun,
  onOpenSettings,
  onOpenAgentRun,
  renderAgentRun,
  onOpenChat,
  renderChat,
  renderModelChip,
  onOpenGroupRun,
  narrow = false,
}: ProcessRunsViewProps) {
  const controls = useProcessRunListControls(projectId)
  const { isLoaded, runs, current, history } = useProcessRuns(controls.request)
  const { settings } = useAppSettings()
  const badgeColor = settings.notifications.badgeColors.processes
  const stopNow = useProcessStopClock()
  const chatNews = useProcessRunChatNews(useChatsSeen())
  const waiting = processRunWaitingCount(runs, stopNow, chatNews)
  const sections = useMemo(
    () => processRunAttentionSections(runs, stopNow, chatNews),
    [runs, stopNow, chatNews],
  )

  // The toggle follows the selected run when it can: opening a finished run from
  // elsewhere (a chat card) should land on History, not leave the user on an
  // empty Current tab wondering where it went.
  const selectedIsHistory = useMemo(
    () => history.some((r) => r.id === selectedRunId),
    [history, selectedRunId],
  )
  const [mode, setMode] = useModeForSelection(selectedIsHistory)
  const rows = mode === 'current' ? current : history
  // One clock for the whole list — ticks while any run has a step working, so
  // its row's time advances; every other row is fixed at its ledger total.
  const now = useDurationTimer(current.some((r) => r.totals?.ticking === true))
  const showLoading = controls.scopePending || !isLoaded
  const listEmpty = mode === 'current' ? sections.length === 0 : rows.length === 0
  const projectNameOf = controls.showProject ? controls.projectName : undefined

  const sidebar = (
    <div
      className="flex h-full min-h-0 flex-col border-r border-(--border-subtle) bg-(--surface-base)"
      style={{ width: narrow ? '100%' : 288 }}
    >
      <div className="flex items-center gap-2 border-b border-(--border-subtle) px-3 py-2.5">
        <SegmentedControl
          size="sm"
          ariaLabel="Show current or historical process runs"
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
                        className="h-4 min-w-4 px-1 text-[10px] ring-0"
                      />
                    ),
                  }
                : {}),
            },
            { value: 'history', label: 'History' },
          ]}
          className="flex-1"
        />
        <Tooltip
          placement="bottom"
          content={<span className="text-xs">Process blueprints (Settings → Processes)</span>}
        >
          <button
            type="button"
            aria-label="Process blueprints"
            onClick={onOpenSettings}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary)"
          >
            <IconSettings className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
      <div
        role="group"
        aria-label="Filter process runs"
        className="flex flex-col gap-1.5 border-b border-(--border-subtle) px-3 py-2"
      >
        <FilterSelect
          label={PROCESS_RUN_LIST_COPY.scope}
          value={controls.scope}
          onChange={controls.setScope}
          options={controls.scopeOptions}
        />
        <div className="flex min-w-0 gap-1.5">
          <div className="min-w-0 flex-1">
            <FilterSelect
              label={PROCESS_RUN_LIST_COPY.story}
              value={controls.story}
              onChange={controls.setStory}
              options={controls.storyOptions}
            />
          </div>
          <div className="min-w-0 flex-1">
            <FilterSelect
              label={PROCESS_RUN_LIST_COPY.status}
              value={controls.status}
              onChange={controls.setStatus}
              options={controls.statusOptions}
            />
          </div>
        </div>
        <FilterSelect
          label={PROCESS_RUN_LIST_COPY.ending}
          value={controls.ending}
          onChange={controls.setEnding}
          options={controls.endingOptions}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {showLoading ? (
          <p className="px-2 py-3 text-[12px] text-(--text-muted)">Loading runs…</p>
        ) : listEmpty ? (
          <p className="px-2 py-3 text-[12px] text-(--text-muted)">
            {controls.narrowed
              ? PROCESS_RUN_LIST_COPY.noMatch
              : mode === 'current'
                ? PROCESS_RUN_LIST_COPY.emptyCurrent
                : PROCESS_RUN_LIST_COPY.emptyHistory}
          </p>
        ) : mode === 'current' ? (
          <div className="flex flex-col gap-2">
            {sections.map((section) => (
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
            ))}
          </div>
        ) : (
          <RunList
            runs={rows}
            now={now}
            stopNow={stopNow}
            chatNews={chatNews}
            selectedRunId={selectedRunId}
            onSelectRun={onSelectRun}
            projectNameOf={projectNameOf}
          />
        )}
      </div>
    </div>
  )

  const detail = selectedRunId ? (
    <div className="h-full min-h-0 min-w-0 flex-1">
      <ProcessPipeline
        // A different run is a different pipeline: an opened leaf or a drill into
        // run A must not carry over into run B's pane.
        key={selectedRunId}
        runId={selectedRunId}
        {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
        {...(renderAgentRun ? { renderAgentRun } : {})}
        {...(onOpenChat ? { onOpenChat } : {})}
        {...(renderChat ? { renderChat } : {})}
        {...(renderModelChip ? { renderModelChip } : {})}
        {...(onOpenGroupRun ? { onOpenGroupRun } : {})}
        narrow={narrow}
      />
    </div>
  ) : (
    <EmptyDetail />
  )

  if (narrow) return selectedRunId ? <div className="h-full min-h-0">{detail}</div> : sidebar

  return (
    <div className="flex h-full min-h-0 w-full">
      {sidebar}
      {detail}
    </div>
  )
}

/** One section of the Current tab: its heading and count in its tone, and its run rows. */
export function RunSection({
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
  stopNow: number
  chatNews: ReadonlyMap<string, ProcessRunChatNews>
  selectedRunId: string | undefined
  onSelectRun: (runId: string, projectId: string) => void
  /** Names a run's project when the list is wider than one. */
  projectNameOf?: (projectId: string) => string | undefined
}) {
  const count = section.runs.length
  return (
    <section aria-label={section.label} className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2 px-2.5 pt-1 pb-0.5">
        <span
          className="min-w-0 flex-1 text-[11.5px] font-semibold"
          style={{ color: `var(--status-${section.tone}-soft-fg)` }}
        >
          {section.label}
        </span>
        {section.counted ? (
          <NotificationBadge
            text={formatBadgeCount(count)}
            color={badgeColor}
            tooltipLabel={PROCESS_RUN_WAITING_TITLE(count)}
            className="h-4 min-w-4 px-1 text-[10px] ring-0"
          />
        ) : (
          <span
            className="text-[11.5px] font-semibold"
            style={{ color: `var(--status-${section.tone}-soft-fg)` }}
          >
            {count}
          </span>
        )}
      </div>
      <RunList
        runs={section.runs}
        now={now}
        stopNow={stopNow}
        chatNews={chatNews}
        selectedRunId={selectedRunId}
        onSelectRun={onSelectRun}
        projectNameOf={projectNameOf}
      />
    </section>
  )
}

function RunList({
  runs,
  now,
  stopNow,
  chatNews,
  selectedRunId,
  onSelectRun,
  projectNameOf,
}: {
  runs: readonly ProcessRun[]
  now: number
  /** The clock who has a stopped run's stop is read against. */
  stopNow: number
  /** What each run's own chat holds for the person, by run id. */
  chatNews: ReadonlyMap<string, ProcessRunChatNews>
  selectedRunId: string | undefined
  onSelectRun: (runId: string, projectId: string) => void
  projectNameOf?: (projectId: string) => string | undefined
}) {
  return (
    <ul className="flex flex-col gap-1">
      {runs.map((run) => (
        <li key={run.id}>
          <RunRow
            run={run}
            now={now}
            stopNow={stopNow}
            chatNews={chatNews.get(run.id)}
            selected={run.id === selectedRunId}
            projectName={projectNameOf?.(run.projectId)}
            onClick={() => onSelectRun(run.id, run.projectId)}
          />
        </li>
      ))}
    </ul>
  )
}

function RunRow({
  run,
  now,
  stopNow,
  chatNews,
  selected,
  projectName,
  onClick,
}: {
  run: ProcessRun
  /** The list's live clock — a running row's elapsed ticks against it. */
  now: number
  stopNow: number
  chatNews: ProcessRunChatNews | undefined
  selected: boolean
  /** Set when the list shows more than one project. */
  projectName?: string
  onClick: () => void
}) {
  const row = processRunListRow(run, stopNow, chatNews)
  const spend = processRunSpend(run)
  const work = processRunWorkLabel(run, now)
  const label = projectName
    ? `${row.title} · ${projectName} · ${row.line}`
    : `${row.title} · ${row.line}`
  return (
    <div
      className={`relative flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-colors ${
        selected
          ? 'border-(--border-strong) bg-(--surface-raised)'
          : 'border-transparent has-[>button:hover]:bg-(--surface-raised)'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={selected}
        aria-label={label}
        className="absolute inset-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
      />
      <div className="pointer-events-none flex items-center gap-2">
        <StatusDot tone={row.tone} />
        <span
          className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-(--text-primary)"
          title={row.title}
        >
          {row.title}
        </span>
        {row.live ? (
          <Spinner size={12} color={`var(--status-${row.tone}-bg)`} className="shrink-0" />
        ) : null}
        {row.fresh ? (
          <DotBadge
            className="size-2 shrink-0"
            colorClass="bg-(--color-brand-600)"
            title={PROCESS_RUN_FRESH_TITLE}
          />
        ) : null}
        {work ? <span className={`shrink-0 ${DURATION_CHIP_CLASS}`}>{work}</span> : null}
      </div>
      {projectName ? (
        <span
          className="pointer-events-none truncate pl-4 text-[11px] text-(--text-muted)"
          title={projectName}
        >
          {projectName}
        </span>
      ) : null}
      <div className="pointer-events-none flex items-center gap-2 pl-4">
        <span
          className={`min-w-0 flex-1 truncate text-[11.5px] ${
            row.asks ? 'font-semibold' : 'text-(--text-secondary)'
          }`}
          style={row.asks ? { color: `var(--status-${row.tone}-soft-fg)` } : undefined}
          title={row.line}
        >
          {row.line}
        </span>
        {spend ? (
          <span className="pointer-events-auto relative inline-flex shrink-0">
            <CostChip label={spend.label} cost={run.totals} title={spend.title} />
          </span>
        ) : null}
      </div>
    </div>
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
  return (
    <NativeSelect
      size="sm"
      aria-label={label}
      title={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 min-w-0 border-(--border-default) bg-(--surface-raised) px-1.5 text-[12px] text-(--text-primary)"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  )
}

function StatusDot({ tone }: { tone: ProcessStatusTone }) {
  return (
    <span
      aria-hidden
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: `var(--status-${tone}-bg)` }}
    />
  )
}

function EmptyDetail() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <IconWorkflow className="h-8 w-8 text-(--text-muted)" />
      <p className="text-[13px] font-medium text-(--text-primary)">Pick a process to watch</p>
      <p className="max-w-[42ch] text-[12px] text-(--text-secondary)">
        Choose a run on the left to follow its pipeline. Runs start when you approve feature work
        from a story's chat.
      </p>
    </div>
  )
}

// The toggle is state, but it must track the selected run's bucket when that
// changes (e.g. navigating in from a finished run's chat card, or a run
// finishing while open). A local state seeded + re-synced from the selection.
function useModeForSelection(selectedIsHistory: boolean): [Mode, (m: Mode) => void] {
  const [mode, setMode] = useState<Mode>(selectedIsHistory ? 'history' : 'current')
  useEffect(() => {
    if (selectedIsHistory) setMode('history')
  }, [selectedIsHistory])
  return [mode, setMode]
}
