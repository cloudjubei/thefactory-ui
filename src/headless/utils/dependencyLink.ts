import type { ResourceLink } from 'thefactory-tools/types'
import type { DependencyLinkTarget } from './dependencyLinkTypes'

/**
 * The in-app link a dependency chip opens: its feature for a feature, its story
 * for a story. `undefined` for a dependency that no longer resolves, or without
 * a project to open it in.
 */
export function dependencyResourceLink(
  target: DependencyLinkTarget,
  projectId: string | null | undefined,
): ResourceLink | undefined {
  if (!projectId || target.kind === 'missing') return undefined
  if (target.kind === 'feature') {
    return { kind: 'feature', projectId, storyId: target.storyId, featureId: target.featureId }
  }
  return { kind: 'story', projectId, storyId: target.storyId }
}
