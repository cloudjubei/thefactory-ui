import { describe, expect, it } from 'vitest'

import { signoffSpecCriteria } from './signoffSpec'
import { SIGNOFF_SPEC_MOVED } from './signoffSpecConstants'

describe('signoffSpecCriteria', () => {
  it('groups each feature’s criteria under its chip, in the story’s order', () => {
    expect(
      signoffSpecCriteria('14', [
        { id: '1', title: 'Progress', acceptance: '- Held-out leads\n- Gaps listed' },
        { id: '2', title: 'In flight', acceptance: 'Empty state explains the gap' },
      ]),
    ).toEqual([
      {
        key: '1',
        dependency: '14.1',
        title: 'Progress',
        criteria: ['Held-out leads', 'Gaps listed'],
      },
      {
        key: '2',
        dependency: '14.2',
        title: 'In flight',
        criteria: ['Empty state explains the gap'],
      },
    ])
  })

  it('leaves out a feature that lists no criteria', () => {
    expect(
      signoffSpecCriteria('3', [
        { id: '1', title: 'A', acceptance: undefined },
        { id: '2', title: 'B', acceptance: '  \n ' },
        { id: '3', title: 'C', acceptance: '1. Works' },
      ]).map((g) => g.dependency),
    ).toEqual(['3.3'])
  })

  it('is empty for a story with no features', () => {
    expect(signoffSpecCriteria('3', [])).toEqual([])
  })
})

describe('signoffSpecCriteria — points moved into a follow-up', () => {
  const split = {
    runId: 'r1',
    entryId: 'e1',
    at: 1,
    featureId: 'f1',
    moved: ['Offline keeps the font', 'RTL keeps the font'],
    acceptance: '- Fonts load',
    followUp: { title: 'Font edges', featureId: 'f9' },
  }

  it('says under a feature what moved into which follow-up, each split once', () => {
    const groups = signoffSpecCriteria(
      's',
      [
        { id: 'f1', title: 'Fonts', acceptance: '- Fonts load' },
        { id: 'f2', title: 'Other', acceptance: '- Works' },
      ],
      [split, { ...split, at: 2, moved: ['Slow network'], followUp: { title: 'Network' } }],
    )
    expect(groups[0]!.moved).toEqual([
      SIGNOFF_SPEC_MOVED('Font edges', ['Offline keeps the font', 'RTL keeps the font']),
      SIGNOFF_SPEC_MOVED('Network', ['Slow network']),
    ])
    expect(groups[1]).not.toHaveProperty('moved')
  })

  it('keeps a feature whose every point is gone when something moved out of it', () => {
    expect(
      signoffSpecCriteria('s', [{ id: 'f1', title: 'Fonts', acceptance: undefined }], [split]),
    ).toEqual([
      {
        key: 'f1',
        dependency: 's.f1',
        title: 'Fonts',
        criteria: [],
        moved: [SIGNOFF_SPEC_MOVED('Font edges', split.moved)],
      },
    ])
  })
})
