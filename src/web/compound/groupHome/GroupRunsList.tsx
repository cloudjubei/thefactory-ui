import { GROUP_STATUS_COPY, type GroupRunRow } from '../../../headless'
import ToneBadge from '../chips/ToneBadge'

export type GroupRunsListProps = {
  runs: readonly GroupRunRow[]
  nameOf: (projectId: string) => string
  onSelect?: (groupRunId: string) => void
}

/** The group runs still open, once each: a row opens its run. */
export default function GroupRunsList({ runs, nameOf, onSelect }: GroupRunsListProps) {
  return (
    <section aria-label={GROUP_STATUS_COPY.groupRuns} className="mb-6">
      <h2 className="mb-2 text-xs font-semibold text-(--text-secondary)">
        {GROUP_STATUS_COPY.groupRuns}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="button"
              onClick={() => onSelect?.(run.id)}
              className="flex w-full min-w-0 items-center gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-left hover:border-(--border-default) hover:bg-(--surface-overlay)"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{run.title}</span>
              <span className="hidden min-w-0 truncate text-[11px] text-(--text-muted) sm:block">
                {run.projectIds.map(nameOf).join(' · ')}
              </span>
              <ToneBadge tone={run.tone}>{run.label}</ToneBadge>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
