import {
  formatProcessDuration,
  processRunCardView,
  processRunSpend,
  useProcessRun,
  type ProcessStatusTone,
} from '../../../headless'

export type ProcessRunChipProps = {
  processRunId: string
  /** Open the pipeline. The card's only action, by design. */
  onOpen: (processRunId: string) => void
}

/**
 * The card a launched run leaves in the chat — one object, three states
 * (running · a decision pending · finished).
 *
 * It REPORTS and it never decides. A parked run says a decision is pending and
 * points into the run; it is never answered here. A finished run holds its
 * result so the conversation can just pick it up. Its one action is to open the
 * pipeline, where every decision is made — a second door to the same decision is
 * how two surfaces drift apart.
 */
export default function ProcessRunChip({ processRunId, onOpen }: ProcessRunChipProps) {
  const { run } = useProcessRun(processRunId)
  if (!run) {
    return (
      <div
        className="w-full rounded-lg border px-3 py-2 text-[11px] text-(--text-secondary)"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
      >
        Loading the pipeline…
      </div>
    )
  }
  const view = processRunCardView(run)
  const spend = processRunSpend(run)
  const durMs = Math.max(0, run.updatedAt - run.startedAt - (run.parkedMs ?? 0))
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
          onClick={() => onOpen(processRunId)}
        >
          {view.cta} ›
        </button>
        <span className="ml-auto flex items-center gap-2 text-[11px] tabular-nums text-(--text-muted)">
          <span>{formatProcessDuration(durMs)}</span>
          {spend ? <span>{spend.label}</span> : null}
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
