import { GROUP_STATUS_COPY, type GroupRunRow, type GroupSharedRunRow } from '../../../headless'
import ProjectChip from '../chips/ProjectChip'
import ToneBadge from '../chips/ToneBadge'

export type GroupRunsListProps = {
  runs: readonly GroupRunRow[]
  /** The runs that belong to the group itself or to several of its members. */
  shared?: readonly GroupSharedRunRow[]
  nameOf: (projectId: string) => string
  onSelect?: (groupRunId: string) => void
  /** A shared run was selected: it opens as its home project's run. */
  onSelectRun?: (runId: string, projectId: string) => void
}

/**
 * What runs for the group as a whole, once each: its group runs still open, and
 * the runs that belong to the group or to several members, each naming its
 * projects. A row opens its run.
 */
export default function GroupRunsList({
  runs,
  shared = [],
  nameOf,
  onSelect,
  onSelectRun,
}: GroupRunsListProps) {
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
        {shared.map((run) => (
          <li
            key={run.id}
            className="relative flex min-w-0 flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 hover:border-(--border-default) hover:bg-(--surface-overlay)"
          >
            <button
              type="button"
              aria-label={`${run.title} · ${run.line}`}
              onClick={() => onSelectRun?.(run.id, run.projectId)}
              className="absolute inset-0 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
            />
            <div className="pointer-events-none flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{run.title}</span>
              <ToneBadge tone={run.tone}>{run.label}</ToneBadge>
            </div>
            <div className="pointer-events-none flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="min-w-0 flex-1 basis-40 truncate text-[11px] text-(--text-secondary)">
                {run.line}
              </span>
              {run.projectIds.map((projectId) => (
                <ProjectChip key={projectId} label={nameOf(projectId)} nonActionable />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
