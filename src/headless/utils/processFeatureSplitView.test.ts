import { describe, expect, it } from 'vitest'
import type { ProcessFeatureSplitOffer } from 'thefactory-tools/types'

import {
  featureSplitDraftStart,
  featureSplitResumeFields,
  featureSplitView,
  parkChoicesWithSplit,
  toggleFeatureSplitPoint,
} from './processFeatureSplitView'
import { FEATURE_SPLIT_COUNT, FEATURE_SPLIT_PICK_POINTS } from './processFeatureSplitViewConstants'

/** Covision run 59d1109e: a verify stop whose acceptance carried four edge cases too many. */
const covision: ProcessFeatureSplitOffer = {
  featureId: 'f-fonts',
  stepId: 'verify',
  points: [
    'Brand fonts load on every screen',
    'Fallback font shows while loading',
    'Offline mode keeps the last font',
    'Right-to-left text keeps its font',
  ],
  proofChange: {
    featureId: 'f-fonts',
    stepId: 'verify',
    current: ['checks', 'ui-video'],
    standings: [
      { kind: 'checks', status: 'met', detail: 'green' },
      { kind: 'ui-video', status: 'unmet', detail: 'no video of the edges' },
    ],
    unavailable: [{ kind: 'unit-tests', reason: 'No test command.' }],
  },
}

const bare: ProcessFeatureSplitOffer = {
  featureId: 'f-fonts',
  stepId: 'verify',
  points: ['One.', 'Two.'],
}

describe('featureSplitDraftStart', () => {
  it('starts with nothing picked, no title, the proof as it stands and no why', () => {
    expect(featureSplitDraftStart(covision)).toEqual({
      moved: [],
      title: '',
      changeProof: false,
      proof: { kinds: ['checks'], save: false, note: '' },
      note: '',
    })
    expect(featureSplitDraftStart(bare).proof).toBeUndefined()
  })
})

describe('toggleFeatureSplitPoint', () => {
  it('picks and unpicks a point, keeping them in order', () => {
    const one = toggleFeatureSplitPoint(featureSplitDraftStart(covision), 3)
    const two = toggleFeatureSplitPoint(one, 1)
    expect(two.moved).toEqual([1, 3])
    expect(toggleFeatureSplitPoint(two, 3).moved).toEqual([1])
  })
})

describe('featureSplitView', () => {
  it('asks for points first, and offers the proof change where the stop does', () => {
    const view = featureSplitView(covision, featureSplitDraftStart(covision))
    expect(view.points.map((p) => [p.number, p.picked])).toEqual([
      [1, false],
      [2, false],
      [3, false],
      [4, false],
    ])
    expect(view).toMatchObject({
      canChangeProof: true,
      changeProof: false,
      problem: FEATURE_SPLIT_PICK_POINTS,
      canSend: false,
    })
    expect(view.proof).toBeUndefined()
  })

  it('can be sent once points are picked and the follow-up named, counting what moves', () => {
    const draft = {
      ...featureSplitDraftStart(covision),
      moved: [1, 2, 3],
      title: 'Font edge cases',
    }
    const view = featureSplitView(covision, draft)
    expect(view).toMatchObject({ canSend: true, count: FEATURE_SPLIT_COUNT(3, 1) })
    expect(view.problem).toBeUndefined()
  })

  it('refuses moving every point, and says a title is missing', () => {
    expect(
      featureSplitView(covision, {
        ...featureSplitDraftStart(covision),
        moved: [0, 1, 2, 3],
        title: 'X',
      }).problem,
    ).toBe('That moves every point. Keep at least one on the feature.')
    expect(
      featureSplitView(covision, { ...featureSplitDraftStart(covision), moved: [1] }).problem,
    ).toBe('Name the follow-up.')
  })

  it('shows the proof editor while changing it, refusing proof the run cannot produce', () => {
    const view = featureSplitView(covision, {
      ...featureSplitDraftStart(covision),
      moved: [3],
      title: 'RTL',
      changeProof: true,
      proof: { kinds: ['checks', 'unit-tests'], save: false, note: '' },
    })
    expect(view.proof?.kinds.find((k) => k.kind === 'unit-tests')?.unavailable).toBe(
      'No test command.',
    )
    expect(view.problem).toBe('Unit tests can’t be produced here: No test command.')
    expect(view.canSend).toBe(false)
  })

  it('offers no proof change at a stop that has none', () => {
    const view = featureSplitView(bare, { ...featureSplitDraftStart(bare), moved: [0], title: 'T' })
    expect([view.canChangeProof, view.proof, view.canSend]).toEqual([false, undefined, true])
  })
})

describe('featureSplitResumeFields', () => {
  it('sends the points by number, the trimmed title, and the proof only while changing it', () => {
    const draft = {
      ...featureSplitDraftStart(covision),
      moved: [1, 3],
      title: '  Font edges ',
      note: ' Too broad. ',
    }
    expect(featureSplitResumeFields(draft)).toEqual({
      movePoints: [2, 4],
      followUpTitle: 'Font edges',
      note: 'Too broad.',
    })
    expect(featureSplitResumeFields({ ...draft, changeProof: true, note: '' })).toEqual({
      movePoints: [2, 4],
      followUpTitle: 'Font edges',
      proofKinds: ['checks'],
    })
  })
})

describe('parkChoicesWithSplit', () => {
  const choices = [{ choice: 'retry' }, { choice: 'split-follow-up' }, { choice: 'abandon' }]

  it('keeps the split where something carries it out, and drops it where nothing does', () => {
    expect(parkChoicesWithSplit(choices, true)).toEqual(choices)
    expect(parkChoicesWithSplit(choices, false).map((c) => c.choice)).toEqual(['retry', 'abandon'])
  })
})
