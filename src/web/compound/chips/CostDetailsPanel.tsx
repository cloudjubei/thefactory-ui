import { Fragment } from 'react'

import type { CostDetailsLine, CostDetailsView } from '../../../headless'

export type CostDetailsPanelProps = {
  view: CostDetailsView
  /** What the cost is of — "Spent so far", "All 3 attempts". */
  title?: string
}

function Lines({ lines, className }: { lines: CostDetailsLine[]; className?: string }) {
  return (
    <dl className={`grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 ${className ?? ''}`}>
      {lines.map((line) => (
        <Fragment key={line.label}>
          <dt className="text-(--text-secondary)">{line.label}</dt>
          <dd className="text-right tabular-nums">{line.value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

/**
 * A cost's details — the one view every cost chip opens. The chip says the
 * charge; this says the rest: tokens a plan covered, tokens with no known
 * price, what it all comes to at list price, a row per model with how it was
 * paid for, and what the record cannot say. Worded in headless
 * (`costDetailsView`) so the native sheet reads the same.
 */
export default function CostDetailsPanel({ view, title }: CostDetailsPanelProps) {
  return (
    <div className="flex min-h-0 w-[300px] max-w-full flex-col gap-2 overflow-y-auto text-xs text-(--text-primary)">
      {title ? <div className="font-semibold">{title}</div> : null}
      <Lines lines={view.summary} />
      {view.rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1 border-t border-(--border-subtle) pt-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">{row.model}</span>
            <span className="shrink-0 tabular-nums">{row.charged}</span>
          </div>
          <div className="text-(--text-secondary)">
            {[row.provider, row.modelId].filter(Boolean).join(' · ')}
          </div>
          <div className="text-(--text-secondary)">{row.billingLabel}</div>
          <Lines lines={row.tokens} />
          <div className="text-(--text-muted)">{row.listValue}</div>
        </div>
      ))}
      {view.notes.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-(--border-subtle) pt-2 text-(--text-muted)">
          {view.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
