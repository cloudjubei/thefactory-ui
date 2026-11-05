import type { ReactNode } from 'react'
import {
  GROUP_HOME_DEFAULT_LAYOUT,
  GROUP_STATUS_COPY,
  type GroupHomeLayout,
  type GroupMemberView,
  type GroupStatusView,
} from '../../headless'
import GroupMemberCard from './groupHome/GroupMemberCard'
import GroupMembersTable from './groupHome/GroupMembersTable'
import GroupRunsList from './groupHome/GroupRunsList'
import GroupStatusBadges from './groupHome/GroupStatusBadges'
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
  /** The group's status for this render. Left out, the projects are plain cards. */
  view?: GroupStatusView
  /** How the status arranges its members. */
  layout?: GroupHomeLayout
  /** Why the status is not shown yet, or could not be read. */
  statusNote?: string
  /** A run listed on a member was selected. */
  onSelectRun?: (runId: string, projectId: string) => void
  /** A group run was selected. */
  onSelectGroupRun?: (groupRunId: string) => void
  /** Optional renderer for additional content beneath the project grid
   *  (e.g. the group's dependency map, a group-level chat preview). */
  footer?: ReactNode
  /** Empty-state copy when the group has no projects. */
  emptyLabel?: string
  /** Shown when no group is selected — caller decides when to render this. */
  missingLabel?: string
  /** When true, render the "no group" message instead of the grid. */
  isMissing?: boolean
  className?: string
}

const projectIcon = (project: GroupHomeProjectCard | undefined) =>
  renderProjectIcon((project?.iconKey ?? 'folder') as ProjectIconKey)

/**
 * A project group's home: what its members are doing, what needs the person
 * and how far along they are, or plain project cards with no `view`. A card
 * opens its project; a listed run opens that run. Shared between web and
 * desktop; `GroupHomeConnected` reads the status and keeps it live.
 */
export default function GroupHome({
  title,
  typeTag,
  subtitle,
  projects,
  onSelectProject,
  view,
  layout = GROUP_HOME_DEFAULT_LAYOUT,
  statusNote,
  onSelectRun,
  onSelectGroupRun,
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

  const projectOf = (projectId: string) => projects.find((p) => p.id === projectId)
  const titleOf = (projectId: string) => projectOf(projectId)?.title ?? projectId
  const select = (projectId: string) =>
    onSelectProject(projectOf(projectId) ?? { id: projectId, title: projectId })
  const memberCards = (members: readonly GroupMemberView[]) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {members.map((member) => (
        <GroupMemberCard
          key={member.projectId}
          title={titleOf(member.projectId)}
          icon={projectIcon(projectOf(member.projectId))}
          member={member}
          onSelect={() => select(member.projectId)}
          {...(onSelectRun ? { onSelectRun } : {})}
        />
      ))}
    </div>
  )

  return (
    <div
      className={`flex flex-col flex-1 overflow-y-auto bg-(--surface-default) text-(--text-primary) p-4 md:p-8 ${className}`}
    >
      <div className="max-w-4xl mx-auto w-full">
        {typeTag ? <p className="text-xs uppercase tracking-wide opacity-60">{typeTag}</p> : null}
        <h1 className="text-2xl font-semibold mt-1 mb-2">{title}</h1>
        <p className={`text-(--text-secondary) ${view || statusNote ? 'mb-3' : 'mb-8'}`}>
          {subtitleText}
        </p>
        {statusNote ? <p className="mb-6 text-sm text-(--text-muted)">{statusNote}</p> : null}
        {view ? (
          <div className="mb-6 flex flex-wrap items-center gap-1.5">
            {view.headline.length > 0 ? (
              <GroupStatusBadges badges={view.headline} />
            ) : (
              <span className="text-sm text-(--text-muted)">{GROUP_STATUS_COPY.allQuiet}</span>
            )}
          </div>
        ) : null}
        {view && view.groupRuns.length > 0 ? (
          <GroupRunsList
            runs={view.groupRuns}
            nameOf={titleOf}
            {...(onSelectGroupRun ? { onSelect: onSelectGroupRun } : {})}
          />
        ) : null}

        {projects.length === 0 ? (
          <p className="text-sm opacity-60">{emptyLabel}</p>
        ) : view && layout === 'table' ? (
          <GroupMembersTable
            members={view.members}
            titleOf={titleOf}
            iconOf={(projectId) => projectIcon(projectOf(projectId))}
            onSelect={select}
          />
        ) : view && layout === 'cards' ? (
          memberCards(view.members)
        ) : view ? (
          <div className="flex flex-col gap-6">
            {view.sections.map((section) => (
              <section key={section.id} aria-label={section.label}>
                <h2 className="mb-2 text-xs font-semibold text-(--text-secondary)">
                  {section.label}
                </h2>
                {memberCards(section.members)}
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProject(p)}
                className="flex items-center gap-3 p-4 rounded-lg border border-(--border-subtle) bg-(--surface-raised) hover:bg-(--surface-overlay) hover:border-(--border-default) transition-colors text-left"
              >
                <div className="text-xl text-(--accent-primary)">{projectIcon(p)}</div>
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
