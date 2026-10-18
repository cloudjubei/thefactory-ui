import { PROJECT_FLAKES_HEADING, projectFlakeRows } from '../../../headless'
import type { ProjectCheckKnownFlake } from '../../../headless/api'

export type ProjectFlakesListProps = {
  /** The project's known flaky tests, from its checks. */
  flakes: readonly ProjectCheckKnownFlake[]
  /** A fixed clock for "last seen"; omitted ⇒ now. */
  now?: number
}

/**
 * The project's known flaky tests — each failed in a full run and passed when
 * its file ran again on its own — the most recently seen first: the test, its
 * file, how many runs it was seen in, when last, and the fix filed once it was
 * seen in enough runs. Nothing when there are none. Native peer:
 * `native/compound/process/ProjectFlakesList`.
 */
export default function ProjectFlakesList({ flakes, now }: ProjectFlakesListProps) {
  const rows = projectFlakeRows(flakes, now ?? Date.now())
  if (rows.length === 0) return null
  return (
    <section className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {PROJECT_FLAKES_HEADING}
      </span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((row) => (
          <li key={row.key} className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[12px]">
            <span className="min-w-0 truncate font-medium text-(--text-primary)" title={row.key}>
              {row.test}
            </span>
            <span className="min-w-0 truncate font-mono text-[11px] text-(--text-secondary)">
              {row.file}
            </span>
            <span className="shrink-0 text-(--text-secondary)">
              {row.seen} · {row.lastSeen}
            </span>
            {row.fix ? (
              <span className="shrink-0 rounded-full border border-(--status-review-soft-border) bg-(--status-review-soft-bg) px-1.5 text-[10.5px] text-(--status-review-soft-fg)">
                {row.fix}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
