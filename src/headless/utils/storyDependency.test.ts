import { describe, expect, it } from 'vitest'

import type { GetStoryResponse } from '../api/generated'
import {
  dependencyChipOf,
  foreignDependency,
  resolveForeignDependency,
  resolveInLookup,
  storyLookup,
  withoutOwnProject,
  featureShownStatus,
} from './storyDependency'
import { DEPENDENCY_LOADING_DISPLAY } from './storyDependencyConstants'
import type { DependencyResolution, ForeignStoriesState } from './storyDependencyTypes'

const UI = 'thefactory-ui'
const BACKEND = 'thefactory-backend'
const STORY = '9d89350a-1111-4111-8111-111111111111'
const FEATURE = '2fe5f472-2222-4222-8222-222222222222'
const BACKEND_STORY = 'abc69641-3333-4333-8333-333333333333'
const BACKEND_FEATURE = '6bd1e900-e790-425a-afd9-24c9f71d4fdd'
const SECOND_FEATURE = '7c7c7c7c-7777-4777-8777-777777777777'
const UNKNOWN = 'deadbeef-4444-4444-8444-444444444444'

function story(id: string, featureIds: string[] = []): GetStoryResponse {
  return {
    id,
    title: `Story ${id.slice(0, 4)}`,
    description: 'D',
    status: 'pending',
    blockers: [STORY],
    features: featureIds.map((f) => ({
      id: f,
      title: `Feature ${f.slice(0, 4)}`,
      description: 'FD',
      status: 'reviewable',
      context: [],
      blockers: [UNKNOWN],
      createdAt: '',
      updatedAt: '',
    })),
    createdAt: '',
    updatedAt: '',
  } as GetStoryResponse
}

const backendStories = [story(UNKNOWN), story(BACKEND_STORY, [SECOND_FEATURE, BACKEND_FEATURE])]
const loaded: ForeignStoriesState = { status: 'loaded', lookup: storyLookup(backendStories), at: 0 }

describe('storyLookup', () => {
  it('finds stories by id and by their 1-based place in the list', () => {
    const lookup = storyLookup(backendStories)
    expect(lookup.byId.get(BACKEND_STORY)?.id).toBe(BACKEND_STORY)
    expect(lookup.positions.get(UNKNOWN)).toBe(1)
    expect(lookup.positions.get(BACKEND_STORY)).toBe(2)
  })
})

describe('foreignDependency', () => {
  it.each([
    [`${BACKEND}/${BACKEND_STORY}`, { projectId: BACKEND, storyId: BACKEND_STORY }],
    [
      `${BACKEND}/${BACKEND_STORY}.${BACKEND_FEATURE}`,
      { projectId: BACKEND, storyId: BACKEND_STORY, featureId: BACKEND_FEATURE },
    ],
  ])('reads %s as another project’s work', (dependency, expected) => {
    expect(foreignDependency(dependency, UI)).toEqual(expected)
  })

  it.each([
    [STORY, 'a bare story id'],
    [`${STORY}.${FEATURE}`, 'a story and feature'],
    [`${UI}/${STORY}.${FEATURE}`, 'work qualified with the project in view'],
    ['3.2', 'a list position'],
    [`${BACKEND}/3.2`, 'a qualified list position'],
    ['waiting on design', 'prose'],
    [` ${BACKEND}/${BACKEND_STORY}`, 'a leading space'],
    [`${BACKEND}/${BACKEND_STORY} `, 'a trailing space'],
  ])('leaves %s alone (%s)', (dependency) => {
    expect(foreignDependency(dependency, UI)).toBeUndefined()
  })

  it('reads any qualified work as foreign when no project is in view', () => {
    expect(foreignDependency(`${UI}/${STORY}`, null)).toEqual({ projectId: UI, storyId: STORY })
  })
})

describe('withoutOwnProject', () => {
  it.each([
    [`${UI}/${STORY}`, STORY],
    [`${UI}/${STORY}.${FEATURE}`, `${STORY}.${FEATURE}`],
    [STORY, STORY],
    [`${BACKEND}/${BACKEND_STORY}`, `${BACKEND}/${BACKEND_STORY}`],
    ['3.2', '3.2'],
  ])('writes %s as %s in the project in view', (dependency, expected) => {
    expect(withoutOwnProject(dependency, UI)).toBe(expected)
  })
})

describe('resolveInLookup', () => {
  const lookup = storyLookup(backendStories)

  it('resolves a story with its place as the display', () => {
    const ref = resolveInLookup(lookup, BACKEND_STORY, undefined, BACKEND_STORY)
    expect(ref).toMatchObject({ kind: 'story', id: BACKEND_STORY, display: '2' })
    expect(ref).not.toHaveProperty('projectId')
  })

  it('resolves a feature with story and feature places, naming the project it is in', () => {
    const id = `${BACKEND}/${BACKEND_STORY}.${BACKEND_FEATURE}`
    expect(
      resolveInLookup(lookup, BACKEND_STORY, BACKEND_FEATURE, id, {
        projectId: BACKEND,
        projectName: 'Backend',
      }),
    ).toMatchObject({
      kind: 'feature',
      id,
      storyId: BACKEND_STORY,
      featureId: BACKEND_FEATURE,
      display: '2.2',
      projectId: BACKEND,
      projectName: 'Backend',
    })
  })

  it('says which of story or feature was not found', () => {
    expect(resolveInLookup(lookup, STORY, undefined, STORY)).toEqual({
      id: STORY,
      code: 'STORY_NOT_FOUND',
      message: "Story wasn't found",
    })
    expect(resolveInLookup(lookup, BACKEND_STORY, FEATURE, 'x')).toEqual({
      id: 'x',
      code: 'FEATURE_NOT_FOUND',
      message: "Feature wasn't found",
    })
  })
})

describe('resolveForeignDependency', () => {
  const dependency = { projectId: BACKEND, storyId: BACKEND_STORY, featureId: BACKEND_FEATURE }
  const id = `${BACKEND}/${BACKEND_STORY}.${BACKEND_FEATURE}`

  it.each([
    ['not yet asked for', undefined],
    ['being fetched', { status: 'loading' } as const],
  ])('is loading, never missing, while the project is %s', (_label, state) => {
    expect(resolveForeignDependency(dependency, state, 'Backend')).toEqual({
      id,
      code: 'LOADING',
      message: "Loading Backend's stories",
      projectId: BACKEND,
      projectName: 'Backend',
    })
  })

  it('resolves once the project is loaded', () => {
    expect(resolveForeignDependency(dependency, loaded, 'Backend')).toMatchObject({
      kind: 'feature',
      id,
      display: '2.2',
      projectId: BACKEND,
      projectName: 'Backend',
    })
  })

  it('is missing only once the project is loaded and the work is not in it', () => {
    expect(
      resolveForeignDependency({ projectId: BACKEND, storyId: STORY }, loaded, 'Backend'),
    ).toEqual({ id: `${BACKEND}/${STORY}`, code: 'STORY_NOT_FOUND', message: "Story wasn't found" })
  })

  it('names a project that could not be read', () => {
    expect(resolveForeignDependency(dependency, { status: 'failed', at: 0 }, 'nowhere')).toEqual({
      id,
      code: 'PROJECT_NOT_FOUND',
      message: "Project nowhere wasn't found",
    })
  })
})

describe('dependencyChipOf', () => {
  const lookup = storyLookup(backendStories)

  it('shows a missing dependency as nothing, so the chip falls back to its own text', () => {
    expect(dependencyChipOf({ id: 'x', code: 'STORY_NOT_FOUND', message: '' })).toBeNull()
  })

  it('shows a loading dependency neutrally, with its project', () => {
    const loading: DependencyResolution = {
      id: 'x',
      code: 'LOADING',
      message: '',
      projectId: BACKEND,
      projectName: 'Backend',
    }
    expect(dependencyChipOf(loading)).toEqual({
      kind: 'loading',
      display: DEPENDENCY_LOADING_DISPLAY,
      project: 'Backend',
    })
  })

  it('shows a story of the project in view without a project', () => {
    expect(dependencyChipOf(resolveInLookup(lookup, BACKEND_STORY, undefined, 'x'))).toEqual({
      kind: 'story',
      display: '2',
      storyId: BACKEND_STORY,
      story: {
        id: BACKEND_STORY,
        title: 'Story abc6',
        description: 'D',
        status: 'pending',
        blockers: [STORY],
      },
    })
  })

  it('shows another project’s feature with that project, to open it there', () => {
    const ref = resolveInLookup(lookup, BACKEND_STORY, BACKEND_FEATURE, 'x', {
      projectId: BACKEND,
      projectName: 'Backend',
    })
    expect(dependencyChipOf(ref)).toEqual({
      kind: 'feature',
      display: '2.2',
      storyId: BACKEND_STORY,
      featureId: BACKEND_FEATURE,
      feature: {
        id: BACKEND_FEATURE,
        title: 'Feature 6bd1',
        description: 'FD',
        status: 'reviewable',
        blockers: [UNKNOWN],
      },
      projectId: BACKEND,
      project: 'Backend',
    })
  })
})

describe('featureShownStatus', () => {
  const storyRef = (status: string): DependencyResolution =>
    ({
      kind: 'story',
      id: 's18',
      storyId: 's18',
      story: { id: 's18', status },
      display: '#18',
    }) as never
  const featureRef = (status: string): DependencyResolution =>
    ({
      kind: 'feature',
      id: 's21.f1',
      storyId: 's21',
      featureId: 'f1',
      story: { id: 's21' },
      feature: { id: 'f1', status },
      display: '#21.1',
    }) as never
  const lost = { id: 'x', code: 'STORY_NOT_FOUND', message: 'no' } as DependencyResolution

  it('shows a pending feature blocked while anything it or its story waits on is not done', () => {
    expect(featureShownStatus('pending', [featureRef('in_progress')], [], 's9')).toBe('blocked')
    expect(featureShownStatus('pending', [], [storyRef('in_progress')], 's9')).toBe('blocked')
  })

  it('shows a pending feature blocked while work in another story is only reviewable', () => {
    expect(featureShownStatus('pending', [featureRef('reviewable')], [], 's9')).toBe('blocked')
    expect(featureShownStatus('pending', [], [storyRef('reviewable')], 's9')).toBe('blocked')
  })

  it('shows its own status once what it waits on is done, or reviewable in its own story', () => {
    expect(featureShownStatus('pending', [featureRef('done')], [storyRef('done')], 's9')).toBe(
      'pending',
    )
    expect(featureShownStatus('pending', [featureRef('reviewable')], [], 's21')).toBe('pending')
  })

  it('never changes a status past pending, and reads a blocker it cannot resolve as nothing', () => {
    expect(featureShownStatus('in_progress', [featureRef('pending')], [], 's9')).toBe('in_progress')
    expect(featureShownStatus('done', [], [storyRef('pending')], 's9')).toBe('done')
    expect(featureShownStatus('pending', [lost], [], 's9')).toBe('pending')
  })
})
