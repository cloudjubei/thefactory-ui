import type { AccessRecordRowView } from '../../../headless'

export type AccessRecordListProps = {
  rows: readonly AccessRecordRowView[]
}

/**
 * One access record a line: who, what they did and when, then the tool and the
 * project, then why it was allowed. Shared by the run report and the run page.
 */
export function AccessRecordList({ rows }: AccessRecordListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((row) => (
        <li key={row.key} className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
            <span className="font-medium text-(--text-primary)">{row.who}</span>
            <span className="text-(--text-secondary)">{row.what}</span>
            <time className="ml-auto text-[11px] tabular-nums text-(--text-muted)">{row.when}</time>
          </div>
          <div className="text-[12px] text-(--text-secondary)">
            <span className="font-mono text-[11px]">{row.tool}</span>
            <span> · </span>
            <span className="font-mono text-[11px]">{row.target}</span>
          </div>
          <p className="m-0 text-[12.5px] leading-relaxed text-(--text-secondary)">{row.why}</p>
        </li>
      ))}
    </ul>
  )
}
