import type { ReactNode } from 'react'
import { renderProjectIcon, type ProjectIconKey } from './projectIcons'
import { IconWarningTriangle } from '../icons'

export type GroupHomeProjectCard = {
  id: string
  title: string
  description?: string
  /** Project icon key the shared `renderProjectIcon` understands. Falls back
   *  to `folder` when missing. */
  iconKey?: ProjectIconKey | string
}

export type GroupHomeProps = {
  /** Group title shown in the header. */
  title: string
  /** Optional subtype tag rendered above the title (e.g. `MAIN`/`SCOPE`). */
  typeTag?: string
  /** Optional one-line subtitle (defaults to `<N> projects`). */
  subtitle?: string
  /** Member projects rendered as a responsive card grid. */
  projects: ReadonlyArray<GroupHomeProjectCard>
  /** Caller decides what clicking a project card does (typically navigate to
   *  its stories tab). */
  onSelectProject: (project: GroupHomeProjectCard) => void
  /** Optional renderer for additional content beneath the project grid
   *  (e.g. a group-level chat preview). */
  footer?: ReactNode
  /** Empty-state copy when the group has no projects. */
  emptyLabel?: string
  /** Shown when no group is selected — caller decides when to render this. */
  missingLabel?: string
  /** When true, render the "no group" message instead of the grid. */
  isMissing?: boolean
  className?: string
}

/**
 * Landing page for a project group. Lists member projects as a responsive
 * card grid; clicking a card invokes `onSelectProject(project)`. Shared
 * between web, desktop, and the upcoming RN target — caller wires its own
 * navigation + icon resolution.
 */
export default function GroupHome({
  title,
  typeTag,
  subtitle,
  projects,
  onSelectProject,
  footer,
  emptyLabel = 'This group has no projects yet.',
  missingLabel = 'Group not found.',
  isMissing = false,
  className = '',
}: GroupHomeProps) {
  if (isMissing) {
    return (
      <div
        className={`flex flex-1 items-center justify-center p-8 text-(--text-secondary) ${className}`}
      >
        <IconWarningTriangle className="w-8 h-8 mr-2" />
        {missingLabel}
      </div>
    )
  }

  const subtitleText =
    subtitle ?? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`

  return (
    <div
      className={`flex flex-col flex-1 overflow-y-auto bg-(--surface-default) text-(--text-primary) p-8 ${className}`}
    >
      <div className="max-w-4xl mx-auto w-full">
        {typeTag ? (
          <p className="text-xs uppercase tracking-wide opacity-60">{typeTag}</p>
        ) : null}
        <h1 className="text-2xl font-semibold mt-1 mb-2">{title}</h1>
        <p className="text-(--text-secondary) mb-8">{subtitleText}</p>

        {projects.length === 0 ? (
          <p className="text-sm opacity-60">{emptyLabel}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p)}
                className="flex items-center gap-3 p-4 rounded-lg border border-(--border-subtle) bg-(--surface-raised) hover:bg-(--surface-overlay) hover:border-(--border-default) transition-colors text-left"
              >
                <div className="text-xl text-(--accent-primary)">
                  {renderProjectIcon((p.iconKey ?? 'folder') as ProjectIconKey)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  {p.description ? (
                    <div className="text-xs text-(--text-tertiary) truncate">{p.description}</div>
                  ) : (
                    <div className="text-xs text-(--text-tertiary) truncate">{p.id}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {footer}
      </div>
    </div>
  )
}
