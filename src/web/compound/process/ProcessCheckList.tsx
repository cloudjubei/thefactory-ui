import {
  PROCESS_CHECK_ADVISORY_LABEL,
  processCheckRows,
  processCheckWaitingView,
  useDurationTimer,
  type ProcessLedgerEntry,
  type ProcessStep,
} from '../../../headless'

export type ProcessCheckListProps = {
  step: Pick<ProcessStep, 'kind'>
  latest: Pick<ProcessLedgerEntry, 'checks' | 'status' | 'queued'> | undefined
  /** A fixed clock for the waiting time; omitted ⇒ it ticks every second while the step waits. */
  now?: number
}

/**
 * Under a checks step's node: each command its newest attempt ran — build,
 * type check, lint, format, unit tests — with how it came out, whether it was
 * only advisory, where it ran (sandbox or host, the reason and the code outside
 * the checkout it built against on hover), whether its failure already fails at
 * the change's base, and how long it took. While the step waits its turn behind
 * another check run of the project, that wait and how long it has lasted.
 * Nothing for any other step.
 */
export default function ProcessCheckList({ step, latest, now }: ProcessCheckListProps) {
  const waitingNow = latest?.status === 'running' && latest.queued !== undefined
  const ticking = useDurationTimer(waitingNow && now === undefined)
  const waiting = processCheckWaitingView({ step, ...(latest ? { latest } : {}) }, now ?? ticking)
  const rows = processCheckRows({ step, ...(latest ? { latest } : {}) })
  if (waiting) {
    return (
      <p
        className="m-0 flex min-w-0 items-baseline gap-2 px-1.5 pt-1 text-[12px]"
        style={{ color: 'var(--status-queued-soft-fg)' }}
      >
        <span className="min-w-0 truncate">{waiting.reason}</span>
        <span className="ml-auto shrink-0 tabular-nums text-[11px] text-(--text-muted)">
          {waiting.waited}
        </span>
      </p>
    )
  }
  if (rows.length === 0) return null
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 px-1.5 pt-1">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex min-w-0 items-baseline gap-2 text-[12px]"
          title={row.summary}
        >
          <span
            aria-hidden
            className="w-3 shrink-0 text-center font-semibold"
            style={{ color: `var(--status-${row.tone}-soft-fg)` }}
          >
            {row.mark}
          </span>
          <span className="shrink-0 font-medium text-(--text-primary)">{row.label}</span>
          <span className="shrink-0" style={{ color: `var(--status-${row.tone}-soft-fg)` }}>
            {row.word}
          </span>
          {row.testCountLabel ? (
            <span className="shrink-0 text-(--text-secondary)">— {row.testCountLabel}</span>
          ) : null}
          {row.advisory ? (
            <span className="shrink-0 rounded-full border border-dashed border-(--border-strong) px-1.5 text-[10px] text-(--text-secondary)">
              {PROCESS_CHECK_ADVISORY_LABEL}
            </span>
          ) : null}
          {row.ranInLabel ? (
            <span
              className="shrink-0 rounded-full border border-(--border-strong) px-1.5 text-[10px] text-(--text-secondary)"
              title={[row.ranInDetail, row.dependencyDetail].filter(Boolean).join(' · ')}
            >
              {row.ranInLabel}
            </span>
          ) : null}
          {row.baselineLabel ? (
            <span
              className="shrink-0 rounded-full border border-dashed border-(--border-strong) px-1.5 text-[10px] text-(--text-secondary)"
              title={row.baselineDetail}
            >
              {row.baselineLabel}
            </span>
          ) : null}
          {row.flaky ? (
            <span
              className="shrink-0 rounded-full border border-(--status-on_hold-soft-border) bg-(--status-on_hold-soft-bg) px-1.5 text-[10px] text-(--status-on_hold-soft-fg)"
              title={row.flaky.detail}
            >
              {row.flaky.label}
            </span>
          ) : null}
          {row.status !== 'passed' && row.summary ? (
            <span className="min-w-0 truncate text-(--text-secondary)">{row.summary}</span>
          ) : null}
          {row.durationLabel ? (
            <span className="ml-auto shrink-0 tabular-nums text-[11px] text-(--text-muted)">
              {row.durationLabel}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
