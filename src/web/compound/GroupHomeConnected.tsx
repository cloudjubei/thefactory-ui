import { useMemo } from 'react'
import {
  GROUP_CONSTELLATION_COPY,
  GROUP_HOME_CLOCK_MS,
  GROUP_STATUS_COPY,
  groupStatusView,
  useDurationTimer,
  useProcessRuns,
  useProjectsGroupConstellation,
  useProjectsGroupStatus,
  type GroupConstellationLayout,
  type ProcessRunListRequest,
} from '../../headless'
import GroupConstellation from './groupHome/GroupConstellation'
import GroupHome, { type GroupHomeProps } from './GroupHome'

export type GroupHomeConnectedProps = Omit<GroupHomeProps, 'view' | 'statusNote' | 'footer'> & {
  groupId: string
  /** How the dependencies are drawn. */
  constellationLayout?: GroupConstellationLayout
  /** Reads times and run lines against this moment instead of the clock. */
  now?: number
}

/**
 * The group's home, live: the roll-up re-read on the backend's signal, the
 * group's current runs on their own socket, and its dependency map. The host
 * wires navigation: to a project, to a run, to a group run.
 */
export default function GroupHomeConnected({
  groupId,
  constellationLayout,
  now: fixedNow,
  ...home
}: GroupHomeConnectedProps) {
  const { projects, onSelectProject } = home
  const { status, isLoaded, loadError } = useProjectsGroupStatus(groupId)
  const { constellation, loadError: constellationError } = useProjectsGroupConstellation(groupId)
  const request = useMemo<ProcessRunListRequest>(
    () => ({
      scope: { kind: 'group', groupId, projectIds: projects.map((project) => project.id) },
      filter: {},
    }),
    [groupId, projects],
  )
  const { current, isLoaded: runsLoaded } = useProcessRuns(request)
  const clock = useDurationTimer(fixedNow === undefined, GROUP_HOME_CLOCK_MS)
  const now = fixedNow ?? clock
  const view = useMemo(
    () => (status ? groupStatusView(status, runsLoaded ? current : undefined, now) : undefined),
    [status, runsLoaded, current, now],
  )
  const statusNote = status
    ? undefined
    : loadError
      ? GROUP_STATUS_COPY.unread
      : isLoaded
        ? undefined
        : GROUP_STATUS_COPY.reading

  const titleOf = (projectId: string) =>
    projects.find((project) => project.id === projectId)?.title ?? projectId
  const selectProject = (projectId: string) =>
    onSelectProject(
      projects.find((project) => project.id === projectId) ?? { id: projectId, title: projectId },
    )

  return (
    <GroupHome
      {...home}
      {...(view ? { view } : {})}
      {...(statusNote ? { statusNote } : {})}
      footer={
        projects.length > 0 ? (
          <section aria-label={GROUP_CONSTELLATION_COPY.title} className="mt-8">
            <h2 className="mb-2 text-xs font-semibold text-(--text-secondary)">
              {GROUP_CONSTELLATION_COPY.title}
            </h2>
            {constellation ? (
              <GroupConstellation
                constellation={constellation}
                {...(constellationLayout ? { layout: constellationLayout } : {})}
                nameOf={titleOf}
                attentionOf={(projectId) =>
                  view?.members.find((member) => member.projectId === projectId)?.attention
                }
                onSelectProject={selectProject}
              />
            ) : (
              <p className="text-sm text-(--text-muted)">
                {constellationError
                  ? GROUP_CONSTELLATION_COPY.unread
                  : GROUP_CONSTELLATION_COPY.reading}
              </p>
            )}
          </section>
        ) : null
      }
    />
  )
}
