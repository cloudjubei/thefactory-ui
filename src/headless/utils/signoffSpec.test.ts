import { describe, expect, it } from 'vitest'

import { signoffSpecCriteria } from './signoffSpec'

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
