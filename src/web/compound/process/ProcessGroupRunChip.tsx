import {
  costChipLabel,
  formatProcessDuration,
  processGroupCardView,
  processGroupWorkMs,
  useDurationTimer,
  useProcessGroupRun,
  type ProcessStatusTone,
} from '../../../headless'
import CostChip from '../chips/CostChip'

export type ProcessGroupRunChipProps = {
  groupRunId: string
  /** Open the group run. The card's only action, by design. */
  onOpen: (groupRunId: string) => void
}

/**
 * The card a group launch leaves in the chat — how many projects, how many
 * merged, and what it waits on. It reports and never decides: every decision is
 * made in the group run it opens.
 */
export default function ProcessGroupRunChip({ groupRunId, onOpen }: ProcessGroupRunChipProps) {
  const { group } = useProcessGroupRun(groupRunId)
  const now = useDurationTimer(group?.totals?.ticking === true)
  if (!group) {
    return (
      <div
        className="w-full rounded-lg border px-3 py-2 text-[11px] text-(--text-secondary)"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
      >
        Loading the group run…
      </div>
    )
  }
  const view = processGroupCardView(group)
  const workMs = processGroupWorkMs(group.totals, now)
  const spend = costChipLabel(group.totals)
  return (
    <div
      className="flex w-full flex-col gap-2 rounded-lg border p-3"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate text-[12.5px] font-semibold text-(--text-primary)">
          {view.title}
        </span>
        <span className="ml-auto shrink-0">
          <ToneBadge tone={view.badge.tone}>{view.badge.label}</ToneBadge>
        </span>
      </div>
      <div className="text-[11px] text-(--text-secondary)">{view.sub}</div>
      {view.body ? (
        <div
          className="rounded-md px-2.5 py-1.5 text-[11.5px]"
          style={{
            background: `var(--status-${view.body.tone}-soft-bg)`,
            color: `var(--status-${view.body.tone}-soft-fg)`,
            border: `1px solid var(--status-${view.body.tone}-soft-border)`,
          }}
        >
          {view.body.text}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-(--border-default) bg-(--surface-base) px-2.5 py-1 text-[11px] font-medium text-(--text-primary) hover:border-(--border-strong)"
          onClick={() => onOpen(groupRunId)}
        >
          {view.cta} ›
        </button>
        <span className="ml-auto flex items-center gap-2 text-[11px] tabular-nums text-(--text-muted)">
          {workMs !== undefined ? <span>{formatProcessDuration(workMs)}</span> : null}
          {spend ? (
            <CostChip
              label={spend}
              cost={group.totals}
              title="Every project, summed"
              appearance="text"
            />
          ) : null}
        </span>
      </div>
    </div>
  )
}

function ToneBadge({ tone, children }: { tone: ProcessStatusTone; children: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-px text-[10px]"
      style={{
        background: `var(--status-${tone}-soft-bg)`,
        color: `var(--status-${tone}-soft-fg)`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      {children}
    </span>
  )
}
