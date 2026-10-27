import { useState } from 'react'

import {
  PROCESS_CHECK_ADVISORY_LABEL,
  processCheckRows,
  processCheckWaitingView,
  siblingFallbackCheckSets,
  siblingFallbackView,
  useDurationTimer,
  type ProcessLedgerEntry,
  type ProcessStep,
  type SiblingFallbackCheckSetId,
} from '../../../headless'
import SegmentedControl from '../../primitives/SegmentedControl'
import SiblingFallbackNotice from './SiblingFallbackNotice'

export type ProcessCheckListProps = {
  step: Pick<ProcessStep, 'kind'>
  latest: Pick<ProcessLedgerEntry, 'checks' | 'status' | 'queued' | 'siblingFallback'> | undefined
  /** A fixed clock for the waiting time; omitted ⇒ it ticks every second while the step waits. */
  now?: number
}

/**
 * Under a checks step's node: each command its newest attempt ran — build,
 * type check, lint, format, unit tests — with how it came out, whether it was
 * only advisory, where it ran (sandbox or host, with the reason on hover), the
 * code outside the checkout it built against, whether its failure already fails at
 * the change's base, and how long it took. While the step waits its turn behind
 * another check run of the project, that wait and how long it has lasted. An
 * attempt that ran again with out-of-tree code at its stable branch leads with
 * that notice and switches between its two runs. Nothing for any other step.
 */
export default function ProcessCheckList({ step, latest, now }: ProcessCheckListProps) {
  const waitingNow = latest?.status === 'running' && latest.queued !== undefined
  const ticking = useDurationTimer(waitingNow && now === undefined)
  const waiting = processCheckWaitingView({ step, ...(latest ? { latest } : {}) }, now ?? ticking)
  const sets = step.kind === 'check' ? siblingFallbackCheckSets(latest) : []
  const [shown, setShown] = useState<SiblingFallbackCheckSetId | undefined>(undefined)
  const set = sets.find((s) => s.id === shown) ?? sets[0]
  const rows = processCheckRows({
    step,
    ...(set ? { latest: { checks: set.checks } } : latest ? { latest } : {}),
  })
  const fallback =
    step.kind === 'check' && !waiting && latest?.siblingFallback
      ? latest.siblingFallback
      : undefined
  if (waiting) {
    return (
      <p
        className="m-0 flex min-w-0 items-baseline gap-2 px-1.5 pt-1 text-[12px]"
        style={{ color: 'var(--status-queued-soft-fg)' }}
      >
        <span className="min-w-0 break-words">{waiting.reason}</span>
        <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-[11px] text-(--text-muted)">
          {waiting.waited}
        </span>
      </p>
    )
  }
  if (rows.length === 0 && !fallback) return null
  const list = (
    <ul className="m-0 flex list-none flex-col gap-0.5 px-1.5 pt-1">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 pl-5 text-[12px]"
          title={row.summary}
        >
          <span
            aria-hidden
            className="-ml-5 w-3 shrink-0 text-center font-semibold"
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
              title={row.ranInDetail}
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
            <span className="min-w-0 break-words text-(--text-secondary)">{row.summary}</span>
          ) : null}
          {row.durationLabel ? (
            <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-[11px] text-(--text-muted)">
              {row.durationLabel}
            </span>
          ) : null}
          {row.dependencyDetail ? (
            <span className="basis-full text-[11px] text-(--text-muted)">
              {row.dependencyDetail}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
  if (!fallback) return list
  return (
    <div className="flex min-w-0 flex-col gap-1.5 pt-1">
      <SiblingFallbackNotice view={siblingFallbackView(fallback)} />
      {sets.length > 0 && set ? (
        <SegmentedControl
          size="sm"
          ariaLabel="Which checks run"
          options={sets.map((s) => ({ value: s.id, label: s.label }))}
          value={set.id}
          onChange={(v) => setShown(v as SiblingFallbackCheckSetId)}
          className="self-start"
        />
      ) : null}
      {rows.length > 0 ? list : null}
    </div>
  )
}
