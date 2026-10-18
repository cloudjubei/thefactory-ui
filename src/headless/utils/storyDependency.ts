import { parseReferenceToken } from 'thefactory-tools/utils'

import type { GetStoryResponse } from '../api/generated'
import type { StoryStatus } from './status'
import { DEPENDENCY_LOADING_DISPLAY } from './storyDependencyConstants'
import type {
  DependencyElsewhere,
  DependencyResolution,
  ForeignDependency,
  ForeignStoriesState,
  InvalidRefError,
  ResolvedDependency,
  ResolvedRef,
  StoryLookup,
} from './storyDependencyTypes'

type WorkDependency = { projectId?: string; storyId: string; featureId?: string }

/** A dependency read with the reference grammar's `#` form; `undefined` when it is no story or feature id. */
function workDependency(dependency: string): WorkDependency | undefined {
  if (dependency.trim() !== dependency) return undefined
  const parsed = parseReferenceToken(`#${dependency}`)
  if (parsed?.type !== 'reference') return undefined
  const { reference } = parsed
  if (reference.kind !== 'story' && reference.kind !== 'feature') return undefined
  return {
    ...(reference.projectId ? { projectId: reference.projectId } : {}),
    storyId: reference.storyId,
    ...(reference.kind === 'feature' ? { featureId: reference.featureId } : {}),
  }
}

function written(work: WorkDependency): string {
  const project = work.projectId ? `${work.projectId}/` : ''
  return `${project}${work.storyId}${work.featureId ? `.${work.featureId}` : ''}`
}

/** A project's stories, by id and by their 1-based place in the list. */
export function storyLookup(stories: readonly GetStoryResponse[]): StoryLookup {
  const byId = new Map<string, GetStoryResponse>()
  const positions = new Map<string, number>()
  stories.forEach((s, i) => {
    byId.set(s.id, s)
    positions.set(s.id, i + 1)
  })
  return { byId, positions }
}

/** The project, story and feature a dependency names, when it is qualified with a project other than the one in view. */
export function foreignDependency(
  dependency: string,
  activeProjectId: string | null | undefined,
): ForeignDependency | undefined {
  const work = workDependency(dependency)
  if (!work?.projectId || work.projectId === activeProjectId) return undefined
  return { ...work, projectId: work.projectId }
}

/** A dependency as the project in view writes it: without its own project before it. */
export function withoutOwnProject(
  dependency: string,
  activeProjectId: string | null | undefined,
): string {
  const work = workDependency(dependency)
  if (!work?.projectId || work.projectId !== activeProjectId) return dependency
  return written({
    storyId: work.storyId,
    ...(work.featureId ? { featureId: work.featureId } : {}),
  })
}

/** A story or feature found in a project's stories, displayed by its place, with the project it is in when that is not the one in view. */
export function resolveInLookup(
  lookup: StoryLookup,
  storyId: string,
  featureId: string | undefined,
  id: string,
  elsewhere?: DependencyElsewhere,
): ResolvedRef | InvalidRefError {
  const story = lookup.byId.get(storyId)
  if (!story) return { id, code: 'STORY_NOT_FOUND', message: "Story wasn't found" }
  const storyAt = lookup.positions.get(story.id) ?? '?'
  if (featureId === undefined) {
    return { kind: 'story', id, storyId, story, display: `${storyAt}`, ...elsewhere }
  }
  const featureAt = story.features.findIndex((f) => f.id === featureId)
  const feature = story.features[featureAt]
  if (!feature) return { id, code: 'FEATURE_NOT_FOUND', message: "Feature wasn't found" }
  return {
    kind: 'feature',
    id,
    storyId,
    featureId,
    story,
    feature,
    display: `${storyAt}.${featureAt + 1}`,
    ...elsewhere,
  }
}

/** Another project's story or feature: loading until its project's stories are in, missing only once they are and it is not among them. */
export function resolveForeignDependency(
  dependency: ForeignDependency,
  state: ForeignStoriesState | undefined,
  projectName: string,
): DependencyResolution {
  const id = written(dependency)
  const { projectId } = dependency
  if (!state || state.status === 'loading') {
    return {
      id,
      code: 'LOADING',
      message: `Loading ${projectName}'s stories`,
      projectId,
      projectName,
    }
  }
  if (state.status === 'failed') {
    return { id, code: 'PROJECT_NOT_FOUND', message: `Project ${projectName} wasn't found` }
  }
  return resolveInLookup(state.lookup, dependency.storyId, dependency.featureId, id, {
    projectId,
    projectName,
  })
}

/** A resolved dependency as its chip shows it; `null` when it was not found. */
export function dependencyChipOf(resolution: DependencyResolution): ResolvedDependency | null {
  if ('code' in resolution) {
    if (resolution.code !== 'LOADING') return null
    return { kind: 'loading', display: DEPENDENCY_LOADING_DISPLAY, project: resolution.projectName }
  }
  const where = resolution.projectId
    ? { projectId: resolution.projectId, project: resolution.projectName ?? resolution.projectId }
    : {}
  if (resolution.kind === 'feature') {
    const f = resolution.feature
    return {
      kind: 'feature',
      display: resolution.display,
      storyId: resolution.storyId,
      featureId: resolution.featureId,
      feature: {
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        blockers: f.blockers,
      },
      ...where,
    }
  }
  const s = resolution.story
  return {
    kind: 'story',
    display: resolution.display,
    storyId: resolution.storyId,
    story: {
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      blockers: s.blockers,
    },
    ...where,
  }
}

/**
 * The status a feature shows: a pending feature reads as blocked while anything
 * it, or its story, waits on is not done yet — reviewable or done — so a
 * feature waiting on a blocker never looks ready to work. Any other status
 * shows as it is; a blocker that cannot be resolved counts as nothing. Pure.
 */
export function featureShownStatus(
  status: StoryStatus,
  featureBlockers: readonly DependencyResolution[],
  storyBlockers: readonly DependencyResolution[],
): StoryStatus {
  if (status !== 'pending') return status
  const waits = [...featureBlockers, ...storyBlockers].some((b) => {
    if (!('kind' in b)) return false
    const blockerStatus = b.kind === 'feature' ? b.feature.status : b.story.status
    return blockerStatus !== 'done' && blockerStatus !== 'reviewable'
  })
  return waits ? 'blocked' : status
}
