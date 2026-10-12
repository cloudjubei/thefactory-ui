import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  dependencyResourceLink,
  resolveResourceNav,
  useActiveProject,
  useReferenceRendering,
  useStories,
} from '../../../headless'
import { dependencyChipOf } from '../../../headless/utils/storyDependency'
import DependencyBulletBase, { type ResolvedDependency } from './DependencyBulletBase'

export type DependencyBulletProps = {
  className?: string
  /** `"storyUuid"` / `"storyUuid.featureUuid"` (or display-index form
   *  `"3"` / `"3.2"`, which the resolver normalises), or another project's
   *  `"projectId/storyUuid[.featureUuid]"`. */
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
  const onOpen = useReferenceRendering()?.onOpen

  const resolved: ResolvedDependency | null = useMemo(
    () => dependencyChipOf(resolveDependency(dependency)),
    [resolveDependency, dependency],
  )

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
        if (r.kind === 'loading') return
        const projectId = r.kind === 'missing' ? undefined : r.projectId
        const link = dependencyResourceLink(r, projectId ?? activeProjectId ?? urlProjectId)
        if (!link) return
        if (onOpen) {
          onOpen(link)
          return
        }
        const nav = resolveResourceNav(link)
        if (nav.type === 'path') navigate(nav.path)
      }}
    />
  )
}
