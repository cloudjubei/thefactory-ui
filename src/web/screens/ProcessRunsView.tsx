import { useEffect, useMemo, useState } from 'react'

import {
  formatProcessDuration,
  processRunCardView,
  useProcessRuns,
  type ProcessNodeRunRef,
  type ProcessRun,
  type ProcessStatusTone,
} from '../../headless'
import SegmentedControl from '../primitives/SegmentedControl'
import Tooltip from '../primitives/Tooltip'
import { IconSettings, IconWorkflow } from '../icons'
import ProcessPipeline from '../compound/process/ProcessPipeline'

export type ProcessRunsViewProps = {
  /** The project whose runs to list. */
  projectId: string
  /** The run whose pipeline fills the detail pane, from the route. */
  selectedRunId?: string
  /** Select a run — the host navigates to its pipeline route. */
  onSelectRun: (runId: string) => void
  /** Open the process blueprints (Settings → Processes). The header cog. */
  onOpenSettings: () => void
  /** A leaf hands off to its agent-run chat — threaded to the pipeline. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
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
 * runs with a Current / History toggle, mirroring the chat sidebar; selecting
 * one shows its pipeline in the detail pane — the same pipeline the chat card
 * opens, so there is one place a run is watched.
 */
export default function ProcessRunsView({
  projectId,
  selectedRunId,
  onSelectRun,
  onOpenSettings,
  onOpenAgentRun,
  narrow = false,
}: ProcessRunsViewProps) {
  const { isLoaded, current, history } = useProcessRuns(projectId)

  // The toggle follows the selected run when it can: opening a finished run from
  // elsewhere (a chat card) should land on History, not leave the user on an
  // empty Current tab wondering where it went.
  const selectedIsHistory = useMemo(
    () => history.some((r) => r.id === selectedRunId),
    [history, selectedRunId],
  )
  const [mode, setMode] = useModeForSelection(selectedIsHistory)
  const rows = mode === 'current' ? current : history

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
            { value: 'current', label: 'Current' },
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
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!isLoaded ? (
          <p className="px-2 py-3 text-[12px] text-(--text-muted)">Loading runs…</p>
        ) : rows.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-(--text-muted)">
            {mode === 'current'
              ? 'No processes are running. Start work on a story from its chat.'
              : 'No finished processes yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((run) => (
              <li key={run.id}>
                <RunRow
                  run={run}
                  selected={run.id === selectedRunId}
                  onClick={() => onSelectRun(run.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const detail = selectedRunId ? (
    <div className="h-full min-h-0 flex-1 overflow-y-auto">
      <ProcessPipeline runId={selectedRunId} {...(onOpenAgentRun ? { onOpenAgentRun } : {})} />
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

function RunRow({
  run,
  selected,
  onClick,
}: {
  run: ProcessRun
  selected: boolean
  onClick: () => void
}) {
  const view = processRunCardView(run)
  const durMs = Math.max(0, run.updatedAt - run.startedAt - (run.parkedMs ?? 0))
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected}
      className={`flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-colors ${
        selected
          ? 'border-(--border-strong) bg-(--surface-raised)'
          : 'border-transparent hover:bg-(--surface-raised)'
      }`}
    >
      <div className="flex items-center gap-2">
        <StatusDot tone={view.badge.tone} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-(--text-primary)">
          {view.title}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-(--text-muted)">
          {formatProcessDuration(durMs)}
        </span>
      </div>
      <div className="flex items-center gap-2 pl-4">
        <span
          className="rounded-full px-1.5 py-px text-[9.5px]"
          style={{
            background: `var(--status-${view.badge.tone}-soft-bg)`,
            color: `var(--status-${view.badge.tone}-soft-fg)`,
          }}
        >
          {view.badge.label}
        </span>
        <span className="min-w-0 truncate text-[11px] text-(--text-secondary)">{view.sub}</span>
      </div>
    </button>
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
