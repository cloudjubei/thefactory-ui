import type { ProcessTimeDetailsView } from '../../../headless'
import { PROCESS_TIME_QUEUED_LABEL, PROCESS_TIME_WAITING_LABEL } from '../../../headless'

export type TimeDetailsPanelProps = {
  view: ProcessTimeDetailsView
  /** What the time is of — "Overall", "Verify · all 3 attempts". */
  title?: string
}

/**
 * Where a time went — the one view every time chip opens. The chip says the
 * total; this splits it into agent thinking, tools & commands and the rest,
 * each with its share, names the slowest tools, and says how long a person was
 * waited on, and how long it waited for other check runs, beside it. Worded in headless (`processTimeDetailsView`) so the
 * native sheet reads the same.
 */
export default function TimeDetailsPanel({ view, title }: TimeDetailsPanelProps) {
  return (
    <div className="flex min-h-0 w-[280px] max-w-full flex-col gap-2 overflow-y-auto text-xs text-(--text-primary)">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{title ?? 'Time worked'}</span>
        <span className="font-semibold tabular-nums">{view.total}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {view.rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-0.5" title={row.hint}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-(--text-secondary)">{row.label}</span>
              <span className="tabular-nums">
                {row.value}
                <span className="ml-1.5 inline-block w-9 text-right text-(--text-muted)">
                  {row.share}
                </span>
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-(--surface-overlay)" aria-hidden>
              <div
                className="h-full rounded-full bg-(--accent-primary)"
                style={{ width: `${Math.round(row.fraction * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {view.tools.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-(--border-subtle) pt-2">
          <div className="text-(--text-muted)">Slowest tools</div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5">
            {view.tools.map((tool) => (
              <div key={tool.label} className="contents">
                <dt className="min-w-0 truncate text-(--text-secondary)">{tool.label}</dt>
                <dd className="text-right tabular-nums">{tool.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {view.waiting ? (
        <div className="flex items-baseline justify-between gap-3 border-t border-(--border-subtle) pt-2 text-(--text-muted)">
          <span>{PROCESS_TIME_WAITING_LABEL}</span>
          <span className="tabular-nums">{view.waiting}</span>
        </div>
      ) : null}
      {view.queued ? (
        <div className="flex items-baseline justify-between gap-3 border-t border-(--border-subtle) pt-2 text-(--text-muted)">
          <span>{PROCESS_TIME_QUEUED_LABEL}</span>
          <span className="tabular-nums">{view.queued}</span>
        </div>
      ) : null}
    </div>
  )
}
