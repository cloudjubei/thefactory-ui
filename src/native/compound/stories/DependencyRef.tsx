import { useMemo } from 'react'

import { dependencyResourceLink, useActiveProject, useStories } from '../../../headless'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import { dependencyChipOf } from '../../../headless/utils/storyDependency'
import DependencyBullet, { type ResolvedDependency } from './DependencyBullet'

export type DependencyRefProps = {
  /** `"storyId"` / `"storyId.featureId"` (or the display-index form `"3"` / `"3.2"`), or another project's `"projectId/storyId[.featureId]"`. */
  dependency: string
  /** The project the reference lives in; the active project when omitted. */
  projectId?: string
  interactive?: boolean
  notFoundDisplay?: string
}

/**
 * The connected story/feature chip — native's peer of web's `DependencyBullet`:
 * resolves its reference through the stories in view, shows the story or
 * feature card on a long press, and opens it through the app's reference
 * navigation on a tap.
 */
export default function DependencyRef({
  dependency,
  projectId,
  interactive = true,
  notFoundDisplay,
}: DependencyRefProps) {
  const { resolveDependency } = useStories()
  const { projectId: activeProjectId } = useActiveProject()
  const rendering = useReferenceRendering()
  const target = projectId ?? activeProjectId

  const resolved: ResolvedDependency | null = useMemo(
    () => dependencyChipOf(resolveDependency(dependency)),
    [resolveDependency, dependency],
  )

  const open = rendering?.onOpen
  return (
    <DependencyBullet
      resolved={resolved}
      dependency={dependency}
      {...(notFoundDisplay ? { notFoundDisplay } : {})}
      interactive={interactive && open !== undefined && target !== undefined}
      onPress={(r) => {
        if (r.kind === 'loading') return
        const link = dependencyResourceLink(
          r,
          (r.kind === 'missing' ? undefined : r.projectId) ?? target,
        )
        if (open && link) open(link)
      }}
    />
  )
}
