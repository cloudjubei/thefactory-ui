import { useState, type ReactNode } from 'react'

import {
  processGroupCardView,
  useProcessGroupRuns,
  type ProcessGroupRun,
  type ProcessNodeRunRef,
  type ProcessStatusTone,
} from '../../headless'
import type { ChatContext } from '../../headless/api'
import SegmentedControl from '../primitives/SegmentedControl'
import { IconChevronLeft, IconWorkflow } from '../icons'
import ProcessGroupPipeline from '../compound/process/ProcessGroupPipeline'
import ProcessPipeline from '../compound/process/ProcessPipeline'

export type ProcessGroupRunsViewProps = {
  /** The group whose group runs to list. */
  groupId: string
  /** The group run whose pipeline fills the detail pane, from the route. */
  selectedGroupRunId?: string
  /** Select a group run — the host navigates to its route. */
  onSelectGroupRun: (groupRunId: string) => void
  /** A project's leaf hands off to its agent-run chat — threaded to its pipeline. */
  onOpenAgentRun?: (ref: ProcessNodeRunRef) => void
  /** Render a leaf's agent-run chat inside a project's pipeline. */
  renderAgentRun?: (ref: ProcessNodeRunRef, onBack: () => void) => ReactNode
  /** Open a chat by its context — threaded to a project's pipeline. */
  onOpenChat?: (context: ChatContext) => void
  /** Render a run's own chat in the run's chat drawer. Threaded to the pipeline. */
  renderChat?: (context: ChatContext, onClose: () => void) => ReactNode
  /** One pane at a time (small screens). */
  narrow?: boolean
}

type Mode = 'current' | 'history'

/**
 * A group's runs across its projects: a Current / History list beside the
 * selected group run's pipeline. A project's own pipeline opens in place, one
 * level down, with the way back to its group run.
 */
export default function ProcessGroupRunsView({
  groupId,
  selectedGroupRunId,
  onSelectGroupRun,
  onOpenAgentRun,
  renderAgentRun,
  onOpenChat,
  renderChat,
  narrow = false,
}: ProcessGroupRunsViewProps) {
  const { isLoaded, current, history } = useProcessGroupRuns(groupId)
  const selectedIsHistory = history.some((r) => r.id === selectedGroupRunId)
  const [pickedMode, setMode] = useState<Mode | undefined>(undefined)
  const mode: Mode = pickedMode ?? (selectedIsHistory ? 'history' : 'current')
  const rows = mode === 'current' ? current : history
  const [openLeg, setOpenLeg] = useState<{ groupRunId: string; runId: string } | undefined>(
    undefined,
  )
  const legRunId = openLeg?.groupRunId === selectedGroupRunId ? openLeg?.runId : undefined

  const sidebar = (
    <div
      className="flex h-full min-h-0 flex-col border-r border-(--border-subtle) bg-(--surface-base)"
      style={{ width: narrow ? '100%' : 288 }}
    >
      <div className="flex items-center gap-2 border-b border-(--border-subtle) px-3 py-2.5">
        <SegmentedControl
          size="sm"
          ariaLabel="Show current or finished group runs"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'current', label: 'Current' },
            { value: 'history', label: 'History' },
          ]}
          className="flex-1"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!isLoaded ? (
          <p className="px-2 py-3 text-[12px] text-(--text-muted)">Loading group runs…</p>
        ) : rows.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-(--text-muted)">
            {mode === 'current'
              ? 'No work is running across this group. Ask its chat to start some.'
              : 'No finished group runs yet.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((group) => (
              <li key={group.id}>
                <GroupRunRow
                  group={group}
                  selected={group.id === selectedGroupRunId}
                  onClick={() => onSelectGroupRun(group.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const detail = selectedGroupRunId ? (
    legRunId ? (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-(--border-subtle) px-3 py-2">
          <button
            type="button"
            onClick={() => setOpenLeg(undefined)}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[12px] text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
          >
            <IconChevronLeft className="h-3.5 w-3.5" />
            Group run
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ProcessPipeline
            key={legRunId}
            runId={legRunId}
            onOpenGroupRun={() => setOpenLeg(undefined)}
            {...(onOpenAgentRun ? { onOpenAgentRun } : {})}
            {...(renderAgentRun ? { renderAgentRun } : {})}
            {...(onOpenChat ? { onOpenChat } : {})}
            {...(renderChat ? { renderChat } : {})}
          />
        </div>
      </div>
    ) : (
      <div className="h-full min-h-0 flex-1 overflow-y-auto">
        <ProcessGroupPipeline
          key={selectedGroupRunId}
          groupRunId={selectedGroupRunId}
          onOpenLegRun={(runId) => setOpenLeg({ groupRunId: selectedGroupRunId, runId })}
        />
      </div>
    )
  ) : (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <IconWorkflow className="h-8 w-8 text-(--text-muted)" />
      <p className="text-[13px] font-medium text-(--text-primary)">Pick a group run to watch</p>
      <p className="max-w-[42ch] text-[12px] text-(--text-secondary)">
        A group run carries one piece of work across several of this group’s projects. Its chat
        starts one when you approve it.
      </p>
    </div>
  )

  if (narrow) return selectedGroupRunId ? <div className="h-full min-h-0">{detail}</div> : sidebar
  return (
    <div className="flex h-full min-h-0 w-full">
      {sidebar}
      {detail}
    </div>
  )
}

function GroupRunRow({
  group,
  selected,
  onClick,
}: {
  group: ProcessGroupRun
  selected: boolean
  onClick: () => void
}) {
  const view = processGroupCardView(group)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected}
      className={`flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary) ${
        selected
          ? 'border-(--border-strong) bg-(--surface-raised)'
          : 'border-transparent hover:bg-(--surface-raised)'
      }`}
    >
      <span className="flex items-center gap-2">
        <StatusDot tone={view.badge.tone} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-(--text-primary)">
          {view.title}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2 pl-4">
        <span
          className="rounded-full px-1.5 py-px text-[9.5px]"
          style={{
            background: `var(--status-${view.badge.tone}-soft-bg)`,
            color: `var(--status-${view.badge.tone}-soft-fg)`,
          }}
        >
          {view.badge.label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-(--text-secondary)">
          {view.sub}
        </span>
      </span>
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
