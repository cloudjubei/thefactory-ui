import { useMemo } from 'react'
import { Text, View } from 'react-native'
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
import { nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
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
 * The group's home, live. Native peer of web's `GroupHomeConnected`: the host
 * pushes its own screens for a project, a run and a group run.
 */
export default function GroupHomeConnected({
  groupId,
  constellationLayout,
  now: fixedNow,
  ...home
}: GroupHomeConnectedProps) {
  const { theme } = useNativeTheme()
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
          <View style={{ gap: nativeSpace[2] }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
              {GROUP_CONSTELLATION_COPY.title}
            </Text>
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
              <Text style={{ fontSize: 13, color: theme.text.muted }}>
                {constellationError
                  ? GROUP_CONSTELLATION_COPY.unread
                  : GROUP_CONSTELLATION_COPY.reading}
              </Text>
            )}
          </View>
        ) : null
      }
    />
  )
}
