import type { ProcessCirclingView } from '../../../headless'

const TONE = {
  background: 'var(--status-stuck-soft-bg)',
  border: '1px solid var(--status-stuck-soft-border)',
  color: 'var(--status-stuck-soft-fg)',
}

/** The "Going in circles" flag on a step's row — the same words wherever the step is shown. */
export function CirclingChip({ view }: { view: ProcessCirclingView }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-px text-[10.5px] font-semibold"
      style={TONE}
      title={view.headline}
    >
      {view.label}
    </span>
  )
}

/**
 * An attempt that went in circles, as a major issue: the flag, how it ran out,
 * the evidence a line each, and — on a stop — what trying again needs.
 */
export function CirclingNotice({
  view,
  showHint = true,
}: {
  view: ProcessCirclingView
  /** Say what a retry needs — on a stop the person answers, not on a card that only reports. */
  showHint?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md px-2.5 py-2" style={TONE}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{view.label}</span>
        <span className="text-[12.5px] font-semibold">{view.headline}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[11.5px]">
        {view.evidence.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {showHint ? <div className="text-[11.5px] font-medium">{view.hint}</div> : null}
    </div>
  )
}

export default CirclingNotice
