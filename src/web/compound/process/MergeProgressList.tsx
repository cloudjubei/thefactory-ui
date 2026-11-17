import { PROCESS_MERGE_HEADING, type ProcessMergeRow } from '../../../headless'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'
import ToneBadge from '../chips/ToneBadge'

export interface MergeProgressListProps {
  rows: readonly ProcessMergeRow[]
  /** Leave out the heading, where the frame names it. */
  bare?: boolean
  /** Open a repo's run, where what waits on it is answered: no button without it. */
  onOpen?: (row: ProcessMergeRow) => void
  /** Send a repo's conflict to an agent, the existing resolve. */
  onResolve?: (row: ProcessMergeRow) => void
}

/** One repo's merge as a line: where it stands, its pull request and checks, and what to do. */
export function MergeProgressRowView({
  row,
  onOpen,
  onResolve,
}: {
  row: ProcessMergeRow
  onOpen?: MergeProgressListProps['onOpen']
  onResolve?: MergeProgressListProps['onResolve']
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ToneBadge tone={row.tone}>{row.label}</ToneBadge>
        {row.active ? <Spinner size={12} /> : null}
        {row.link ? (
          <a
            href={row.link.url}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-medium text-(--accent-primary) underline"
          >
            {row.link.label} ↗
          </a>
        ) : null}
        {row.checksLink ? (
          <a
            href={row.checksLink.url}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-(--text-secondary) underline"
          >
            {row.checksLink.label} ↗
          </a>
        ) : null}
      </div>
      {row.line ? <span className="text-[11.5px] text-(--text-secondary)">{row.line}</span> : null}
      {(row.canResolve && onResolve) || (row.openLabel && onOpen) ? (
        <div className="flex flex-wrap gap-2">
          {row.canResolve && onResolve ? (
            <Button size="sm" onClick={() => onResolve(row)}>
              {row.openLabel}
            </Button>
          ) : row.openLabel && onOpen ? (
            <Button size="sm" variant="secondary" onClick={() => onOpen(row)}>
              {row.openLabel} ›
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Each repo's merge after Accept: bringing in the base, waiting for checks,
 * merged or already merged, a conflict or failed checks, with the way to the
 * existing resolve and retry. Native peer: `native/compound/process/MergeProgressList`.
 */
export default function MergeProgressList({
  rows,
  bare = false,
  onOpen,
  onResolve,
}: MergeProgressListProps) {
  if (rows.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {bare ? null : (
        <span className="text-[13px] font-semibold text-(--text-primary)">
          {PROCESS_MERGE_HEADING}
        </span>
      )}
      <ul className="m-0 flex list-none flex-col divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle) bg-(--surface-raised) p-0">
        {rows.map((row) => (
          <li key={row.legId ?? row.projectId} className="flex flex-col gap-1 px-3 py-2">
            {rows.length > 1 ? (
              <span className="text-[12.5px] font-medium text-(--text-primary)">{row.name}</span>
            ) : null}
            <MergeProgressRowView
              row={row}
              {...(onOpen ? { onOpen } : {})}
              {...(onResolve ? { onResolve } : {})}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
