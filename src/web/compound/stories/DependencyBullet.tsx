import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useActiveProject, useStories } from '../../../headless'
import DependencyBulletBase, { type ResolvedDependency } from './DependencyBulletBase'
import type { StoryStatus } from '../StoryCard'

export type DependencyBulletProps = {
  className?: string
  /** `"storyUuid"` / `"storyUuid.featureUuid"` (or display-index form
   *  `"3"` / `"3.2"`, which the resolver normalises). */
  dependency: string
  isOutbound?: boolean
  notFoundDependencyDisplay?: string
  onRemove?: () => void
  interactive?: boolean
  disableHoverInfo?: boolean
}

/**
 * Web/desktop dependency-bullet that resolves its `dependency` string
 * through `StoriesContext` and navigates with react-router-dom on click.
 * Built on top of the presentational `DependencyBulletBase`.
 */
export default function DependencyBullet({
  className = '',
  dependency,
  isOutbound = false,
  notFoundDependencyDisplay,
  onRemove,
  interactive = true,
  disableHoverInfo = false,
}: DependencyBulletProps) {
  const navigate = useNavigate()
  const { projectId: urlProjectId } = useParams<{ projectId: string }>()
  const { projectId: activeProjectId } = useActiveProject()
  const { resolveDependency } = useStories()

  const resolved: ResolvedDependency | null = useMemo(() => {
    const ref = resolveDependency(dependency)
    if ('code' in ref) return null
    if (ref.kind === 'feature') {
      return {
        kind: 'feature',
        display: ref.display,
        storyId: ref.storyId,
        featureId: ref.featureId,
        feature: {
          id: ref.feature.id,
          title: ref.feature.title,
          description: ref.feature.description,
          status: ref.feature.status as StoryStatus,
          blockers: ref.feature.blockers,
        },
      }
    }
    return {
      kind: 'story',
      display: ref.display,
      storyId: ref.storyId,
      story: {
        id: ref.story.id,
        title: ref.story.title,
        description: ref.story.description,
        status: ref.story.status as StoryStatus,
        blockers: ref.story.blockers,
      },
    }
  }, [resolveDependency, dependency])

  return (
    <DependencyBulletBase
      resolved={resolved}
      className={className}
      dependency={dependency}
      notFoundDisplay={notFoundDependencyDisplay}
      isOutbound={isOutbound}
      onRemove={onRemove}
      interactive={interactive}
      disableHoverInfo={disableHoverInfo}
      onClick={(r) => {
        if (r.kind === 'missing') return
        const targetProjectId = activeProjectId ?? urlProjectId
        if (!targetProjectId) return
        navigate(`/projects/${targetProjectId}/stories/${r.storyId}`)
      }}
    />
  )
}
