import { describe, expect, it } from 'vitest'
import type { Status } from 'thefactory-tools/types'

import { storyFeatureCounts } from './storyFeatureCounts'

const features = (...statuses: Status[]) => statuses.map((status) => ({ status }))

describe('storyFeatureCounts', () => {
  it('counts done against the total, and says nothing of review when nothing waits for it', () => {
    expect(storyFeatureCounts(features('done', 'pending'))).toEqual({
      done: 1,
      reviewable: 0,
      total: 2,
      doneText: '1/2',
      title: '1 of 2 features done',
    })
  })

  it('shows verified work beside done, never folded into it', () => {
    const counts = storyFeatureCounts(features('reviewable', 'reviewable', 'done'))
    expect(counts.doneText).toBe('1/3')
    expect(counts.reviewable).toBe(2)
    expect(counts.reviewableText).toBe('2 reviewable')
    expect(counts.title).toBe('2 reviewable, 1 done of 3 features')
  })

  it('tolerates a story whose features are missing', () => {
    expect(storyFeatureCounts(undefined)).toMatchObject({ done: 0, total: 0, doneText: '0/0' })
  })
})
