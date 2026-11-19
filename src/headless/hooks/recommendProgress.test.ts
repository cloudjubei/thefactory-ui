import { describe, expect, it } from 'vitest'
import type { CatalogItem, RecommendProgressData } from '../api/generated'
import {
  applyRecommendProgress,
  EMPTY_RECOMMEND_PROGRESS,
  recommendPreviewHandle,
} from './recommendProgress'

const target = { projectId: 'p', activityId: 'a', recordType: 'products' }
const item = (key: string, summary = key): CatalogItem => ({
  key,
  summary,
  identity: { name: key },
  categoryPaths: [],
  description: '',
  composition: {},
  offers: [],
  criteria: {},
  sources: [],
  freshness: {},
})
const event = (
  items: CatalogItem[],
  extra: Partial<RecommendProgressData> = {},
): RecommendProgressData => ({
  ...target,
  stepKey: 'gather',
  progress: {
    phase: 'items',
    suppliersDone: 1,
    suppliersTotal: 3,
    suppliers: ['chairs'],
    supplierStates: { chairs: 'done' },
    itemsSoFar: items.length,
    categoryResult: { categoryPath: ['chairs'], status: 'completed', items },
  },
  ...extra,
})

describe('recommend progress', () => {
  it('renders successive category deltas without duplicates and revises products by key', () => {
    const first = applyRecommendProgress(EMPTY_RECOMMEND_PROGRESS, event([item('chair')]), target)
    const second = applyRecommendProgress(
      first,
      event([item('desk'), item('chair', 'revised')]),
      target,
    )
    expect(second.steps.gather?.items.map((i) => i.summary)).toEqual(['revised', 'desk'])
    const checkpoint = event([])
    delete checkpoint.progress.categoryResult
    expect(applyRecommendProgress(second, checkpoint, target).steps.gather?.items).toEqual(
      second.steps.gather?.items,
    )
  })
  it.each([{ projectId: 'other' }, { activityId: 'other' }, { recordType: 'other' }])(
    'ignores unrelated scope %s',
    (extra) => {
      expect(
        applyRecommendProgress(EMPTY_RECOMMEND_PROGRESS, event([item('no')], extra), target),
      ).toBe(EMPTY_RECOMMEND_PROGRESS)
    },
  )
  it('isolates repeated pipeline steps and keeps deadline partials', () => {
    const first = applyRecommendProgress(EMPTY_RECOMMEND_PROGRESS, event([item('chair')]), target)
    const next = event([item('desk')], { stepKey: 'gather-again' })
    next.progress.categoryResult!.status = 'deadline'
    const second = applyRecommendProgress(first, next, target)
    expect(second.steps.gather?.items[0]?.key).toBe('chair')
    expect(second.steps['gather-again']?.items[0]?.key).toBe('desk')
    expect(second.steps['gather-again']?.progress.categoryResult?.status).toBe('deadline')
  })
  it('requires an explicit activity identity, never matching by category alone', () => {
    expect(recommendPreviewHandle({ recordType: 'products' }, {})).toBeUndefined()
    expect(recommendPreviewHandle({ activityId: 'a', projectId: 'p' }, undefined)).toEqual({
      activityId: 'a',
      projectId: 'p',
    })
  })
})
