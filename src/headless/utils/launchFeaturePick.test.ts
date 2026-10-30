import { describe, expect, it } from 'vitest'

import {
  launchFeaturePickMetadata,
  launchFeaturePickOffered,
  launchFeaturePickRows,
  launchFeaturePicked,
  launchFeaturePreviewIds,
  toggleLaunchFeaturePick,
} from './launchFeaturePick'

const pool = [
  { id: 'f1', title: 'Route' },
  { id: 'f2', title: 'Docs' },
  { id: 'f3', title: 'Probe' },
]

describe('launchFeaturePicked — which of the story’s open features the launch works', () => {
  it('is every open feature until the person picks, when the agent named none', () => {
    expect(launchFeaturePicked(pool, undefined, undefined)).toEqual(['f1', 'f2', 'f3'])
  })

  it('is the features the agent named, in story order, until the person picks', () => {
    expect(launchFeaturePicked(pool, ['f3', 'f1', 'gone'], undefined)).toEqual(['f1', 'f3'])
  })

  it('is every open feature when what the agent named is no longer open', () => {
    expect(launchFeaturePicked(pool, ['gone'], undefined)).toEqual(['f1', 'f2', 'f3'])
  })

  it('is the person’s pick once they made one, even an empty one', () => {
    expect(launchFeaturePicked(pool, ['f1'], ['f2'])).toEqual(['f2'])
    expect(launchFeaturePicked(pool, undefined, [])).toEqual([])
  })
})

describe('toggleLaunchFeaturePick', () => {
  it('takes a picked feature out and puts it back in story order', () => {
    const out = toggleLaunchFeaturePick(pool, undefined, undefined, 'f2')
    expect(out).toEqual(['f1', 'f3'])
    expect(toggleLaunchFeaturePick(pool, undefined, out, 'f2')).toEqual(['f1', 'f2', 'f3'])
  })

  it('starts from what the agent named', () => {
    expect(toggleLaunchFeaturePick(pool, ['f1'], undefined, 'f3')).toEqual(['f1', 'f3'])
  })
})

describe('launchFeaturePickRows', () => {
  it('lists every open feature once, in story order, saying which are picked', () => {
    expect(launchFeaturePickRows(pool, ['f3'])).toEqual([
      { featureId: 'f1', title: 'Route', picked: false },
      { featureId: 'f2', title: 'Docs', picked: false },
      { featureId: 'f3', title: 'Probe', picked: true },
    ])
  })
})

describe('launchFeaturePickOffered', () => {
  it('offers a pick only when there is more than one feature to choose from', () => {
    expect(launchFeaturePickOffered(pool)).toBe(true)
    expect(launchFeaturePickOffered(pool.slice(0, 1))).toBe(false)
    expect(launchFeaturePickOffered([])).toBe(false)
  })
})

describe('launchFeaturePreviewIds — what the plan is read for', () => {
  it('reads the whole story while every feature is picked, else only the pick', () => {
    expect(launchFeaturePreviewIds(pool, ['f1', 'f2', 'f3'])).toBeUndefined()
    expect(launchFeaturePreviewIds(pool, ['f2'])).toEqual(['f2'])
  })

  it('reads the whole story while nothing is picked — the card asks for a pick instead', () => {
    expect(launchFeaturePreviewIds(pool, [])).toBeUndefined()
  })

  it('reads what the agent named while the pick is still theirs — the plan read before the story loaded stands', () => {
    expect(launchFeaturePreviewIds(pool, ['f1', 'f2', 'f3'], ['f3', 'f1', 'f2'])).toEqual([
      'f3',
      'f1',
      'f2',
    ])
    expect(launchFeaturePreviewIds(pool.slice(0, 1), ['f1'], ['f1'])).toEqual(['f1'])
  })

  it('reads the pick once it differs from what the agent named', () => {
    expect(launchFeaturePreviewIds(pool, ['f1', 'f2', 'f3'], ['f1'])).toBeUndefined()
    expect(launchFeaturePreviewIds(pool, ['f2'], ['f1', 'f2'])).toEqual(['f2'])
    expect(launchFeaturePreviewIds(pool, ['f1', 'f2'], ['f1', 'f2', 'gone'])).toEqual(['f1', 'f2'])
    expect(launchFeaturePreviewIds(pool, ['f1', 'f2'], ['f1', 'gone'])).toEqual(['f1', 'f2'])
  })
})

describe('launchFeaturePickMetadata — what the decision carries', () => {
  it('names the picked features, so the person’s pick replaces the agent’s', () => {
    expect(launchFeaturePickMetadata(['f1', 'f3'])).toEqual({ featureIds: ['f1', 'f3'] })
  })

  it('carries nothing for an empty pick', () => {
    expect(launchFeaturePickMetadata([])).toBeUndefined()
  })
})
