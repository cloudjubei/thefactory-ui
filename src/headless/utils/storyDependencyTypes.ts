import type { Feature, GetStoryResponse } from '../api/generated'
import type { StoryStatus } from './status'

/** Where a resolved story or feature lives, when that is not the project in view. */
export type DependencyElsewhere = {
  projectId: string
  /** The project's title, or its id when it has none. */
  projectName: string
}

export type ResolvedStoryRef = {
  kind: 'story'
  id: string
  storyId: string
  story: GetStoryResponse
  display: string
} & Partial<DependencyElsewhere>

export type ResolvedFeatureRef = {
  kind: 'feature'
  id: string
  storyId: string
  featureId: string
  story: GetStoryResponse
  feature: Feature
  display: string
} & Partial<DependencyElsewhere>

export type ResolvedRef = ResolvedStoryRef | ResolvedFeatureRef

export type InvalidRefError = {
  id: string
  code:
    | 'EMPTY'
    | 'BAD_FORMAT'
    | 'BAD_STORY_ID'
    | 'STORY_NOT_FOUND'
    | 'FEATURE_NOT_FOUND'
    | 'PROJECT_NOT_FOUND'
  message: string
}

/** Another project's story or feature whose project's stories are still being fetched. */
export type LoadingRef = {
  id: string
  code: 'LOADING'
  message: string
} & DependencyElsewhere

/** What a dependency string comes to: resolved, still loading, or not found. */
export type DependencyResolution = ResolvedRef | LoadingRef | InvalidRefError

/** A dependency qualified with a project other than the one in view: `<projectId>/<storyId>[.<featureId>]`. */
export type ForeignDependency = {
  projectId: string
  storyId: string
  featureId?: string
}

/** A project's stories, by id and by their 1-based place in the list. */
export type StoryLookup = {
  byId: ReadonlyMap<string, GetStoryResponse>
  positions: ReadonlyMap<string, number>
}

/** Where fetching another project's stories has got to. */
export type ForeignStoriesState =
  | { status: 'loading' }
  | { status: 'loaded'; lookup: StoryLookup; at: number }
  | { status: 'failed'; at: number }

/** Fetches a project's stories in list order; rejects when the project cannot be read. */
export type FetchProjectStories = (projectId: string) => Promise<GetStoryResponse[]>

/** What a dependency chip's card shows of a story or feature. */
export type DependencyCardShape = {
  id: string
  title: string
  description?: string
  status: StoryStatus
  blockers?: ReadonlyArray<string>
}

/** The project a chip names before its number, and where it opens. */
export type DependencyChipProject = {
  projectId?: string
  /** Shown before the number, for a story or feature of another project. */
  project?: string
}

/** A dependency as a chip shows it. */
export type ResolvedDependency =
  | { kind: 'missing'; display: string }
  | { kind: 'loading'; display: string; project: string }
  | ({
      kind: 'story'
      display: string
      storyId: string
      story: DependencyCardShape
    } & DependencyChipProject)
  | ({
      kind: 'feature'
      display: string
      storyId: string
      featureId: string
      feature: DependencyCardShape
    } & DependencyChipProject)
