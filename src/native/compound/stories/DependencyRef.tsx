import { useMemo } from 'react'

import { useActiveProject, useStories } from '../../../headless'
import { useReferenceRendering } from '../../../headless/contexts/ReferenceRenderingContext'
import DependencyBullet, { type ResolvedDependency } from './DependencyBullet'

export type DependencyRefProps = {
  /** `"storyId"` / `"storyId.featureId"` (or the display-index form `"3"` / `"3.2"`). */
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

  const resolved: ResolvedDependency | null = useMemo(() => {
    const ref = resolveDependency(dependency)
    if ('code' in ref) return null
    if (ref.kind === 'feature') {
      const f = ref.feature
      return {
        kind: 'feature',
        display: ref.display,
        storyId: ref.storyId,
        featureId: ref.featureId,
        feature: {
          id: f.id,
          title: f.title,
          description: f.description,
          status: f.status,
          blockers: f.blockers,
        },
      }
    }
    const s = ref.story
    return {
      kind: 'story',
      display: ref.display,
      storyId: ref.storyId,
      story: {
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        blockers: s.blockers,
      },
    }
  }, [resolveDependency, dependency])

  const open = rendering?.onOpen
  return (
    <DependencyBullet
      resolved={resolved}
      dependency={dependency}
      {...(notFoundDisplay ? { notFoundDisplay } : {})}
      interactive={interactive && open !== undefined && target !== undefined}
      onPress={(r) => {
        if (!open || !target || r.kind === 'missing') return
        open(
          r.kind === 'feature'
            ? { kind: 'feature', projectId: target, storyId: r.storyId, featureId: r.featureId }
            : { kind: 'story', projectId: target, storyId: r.storyId },
        )
      }}
    />
  )
}
