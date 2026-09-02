import { describe, expect, it } from 'vitest'
import {
  filterFeatures,
  filterStories,
  sortFeatures,
  sortStories,
  storyHasRejectedFeatures,
} from './storiesOptions'

type TestStory = {
  id: string
  title?: string | null
  description?: string | null
  status: string
  features?: ReadonlyArray<{ rejection?: string | null }> | null
}

type TestFeature = {
  id: string
  title?: string | null
  description?: string | null
  status: string
  rejection?: string | null
}

const stories: TestStory[] = [
  { id: 's1', title: 'Login flow', description: 'authentication', status: 'done', features: [] },
  {
    id: 's2',
    title: 'Signup',
    description: 'register new users',
    status: 'pending',
    features: [{ rejection: 'needs work' }],
  },
  {
    id: 's3',
    title: 'Dashboard',
    description: 'home screen',
    status: 'in_progress',
    features: null,
  },
  {
    id: 's4',
    title: 'Billing',
    description: 'payments',
    status: 'done',
    features: [{ rejection: null }, { rejection: 'redo this' }],
  },
]

const STORY_INDEX: Record<string, number> = { s1: 1, s2: 2, s3: 3, s4: 4 }
const displayIndexOf = (id: string): number | undefined => STORY_INDEX[id]

describe('storyHasRejectedFeatures', () => {
  it('is true when a feature carries a rejection', () => {
    expect(storyHasRejectedFeatures(stories[1])).toBe(true)
    expect(storyHasRejectedFeatures(stories[3])).toBe(true)
  })
  it('is false with no features or no rejections', () => {
    expect(storyHasRejectedFeatures(stories[0])).toBe(false)
    expect(storyHasRejectedFeatures(stories[2])).toBe(false)
    expect(storyHasRejectedFeatures({})).toBe(false)
  })
})

describe('filterStories', () => {
  it('returns every story with no options', () => {
    expect(filterStories(stories)).toHaveLength(4)
  })
  it('filters by exact status', () => {
    expect(filterStories(stories, { statusFilter: 'done' }).map((s) => s.id)).toEqual(['s1', 's4'])
    expect(filterStories(stories, { statusFilter: 'in_progress' }).map((s) => s.id)).toEqual(['s3'])
  })
  it('"not-done" excludes Done stories without rejected features', () => {
    // s1 is Done with no rejections -> excluded; s4 is Done WITH a rejection -> kept.
    expect(filterStories(stories, { statusFilter: 'not-done' }).map((s) => s.id)).toEqual([
      's2',
      's3',
      's4',
    ])
  })
  it('matches the query against display index, title and description', () => {
    expect(filterStories(stories, { query: 'login' }).map((s) => s.id)).toEqual(['s1'])
    expect(filterStories(stories, { query: 'REGISTER' }).map((s) => s.id)).toEqual(['s2'])
    expect(filterStories(stories, { query: '3', displayIndexOf }).map((s) => s.id)).toEqual(['s3'])
  })
  it('combines status and query', () => {
    expect(
      filterStories(stories, { statusFilter: 'done', query: 'billing' }).map((s) => s.id),
    ).toEqual(['s4'])
  })
})

describe('sortStories', () => {
  it('sorts by display index ascending and descending', () => {
    const input = [stories[2], stories[0], stories[3], stories[1]]
    expect(sortStories(input, { sortBy: 'index_asc', displayIndexOf }).map((s) => s.id)).toEqual([
      's1',
      's2',
      's3',
      's4',
    ])
    expect(sortStories(input, { sortBy: 'index_desc', displayIndexOf }).map((s) => s.id)).toEqual([
      's4',
      's3',
      's2',
      's1',
    ])
  })
  it('sorts by status rank with a display-index tie-break', () => {
    // STATUS_ORDER = ['-', '~', '+', '=', '?']
    expect(sortStories(stories, { sortBy: 'status_asc', displayIndexOf }).map((s) => s.id)).toEqual(
      ['s2', 's3', 's1', 's4'],
    )
    expect(
      sortStories(stories, { sortBy: 'status_desc', displayIndexOf }).map((s) => s.id),
    ).toEqual(['s4', 's1', 's3', 's2'])
  })
  it('does not mutate the input array', () => {
    const input = [stories[1], stories[0]]
    sortStories(input, { sortBy: 'index_asc', displayIndexOf })
    expect(input.map((s) => s.id)).toEqual(['s2', 's1'])
  })
})

const features: TestFeature[] = [
  { id: 'f1', title: 'Form', description: 'the form', status: 'done' },
  { id: 'f2', title: 'Validation', description: 'rules', status: 'pending' },
  { id: 'f3', title: 'Submit', description: 'send it', status: 'done', rejection: 'broken' },
]

const FEATURE_INDEX: Record<string, number> = { f1: 1, f2: 2, f3: 3 }
const featureIndexOf = (id: string): number | undefined => FEATURE_INDEX[id]

describe('filterFeatures', () => {
  it('filters by exact status', () => {
    expect(filterFeatures(features, { statusFilter: 'done' }).map((f) => f.id)).toEqual([
      'f1',
      'f3',
    ])
  })
  it('"not-done" excludes Done features without a rejection', () => {
    expect(filterFeatures(features, { statusFilter: 'not-done' }).map((f) => f.id)).toEqual([
      'f2',
      'f3',
    ])
  })
  it('matches the query', () => {
    expect(filterFeatures(features, { query: 'valid' }).map((f) => f.id)).toEqual(['f2'])
  })
})

describe('sortFeatures', () => {
  it('keeps input order for index_asc and reverses for index_desc', () => {
    expect(sortFeatures(features, { sortBy: 'index_asc' }).map((f) => f.id)).toEqual([
      'f1',
      'f2',
      'f3',
    ])
    expect(sortFeatures(features, { sortBy: 'index_desc' }).map((f) => f.id)).toEqual([
      'f3',
      'f2',
      'f1',
    ])
  })
  it('sorts by status rank with a tie-break', () => {
    expect(
      sortFeatures(features, { sortBy: 'status_asc', displayIndexOf: featureIndexOf }).map(
        (f) => f.id,
      ),
    ).toEqual(['f2', 'f1', 'f3'])
  })
  it('does not mutate the input array', () => {
    const input = [...features]
    sortFeatures(input, { sortBy: 'index_desc' })
    expect(input.map((f) => f.id)).toEqual(['f1', 'f2', 'f3'])
  })
})
