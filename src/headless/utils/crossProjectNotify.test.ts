import { describe, expect, it } from 'vitest'
import type { FeatureRequestStatus } from 'thefactory-tools/types'
import { crossProjectNotification } from './crossProjectNotify'

describe('crossProjectNotification', () => {
  it.each<[FeatureRequestStatus, string]>([
    ['pending', 'New feature request'],
    ['in_review', 'Feature request ready for review'],
    ['completed', 'Feature request completed'],
    ['failed', 'Feature request failed'],
    ['rejected', 'Feature request rejected'],
  ])('notifies on the meaningful transition %s', (status, title) => {
    const n = crossProjectNotification({ id: 'fr1', title: 'Add rate limiting', status })
    expect(n).toEqual({ title, body: 'Add rate limiting', tag: 'cross-project:fr1' })
  })

  it.each<[FeatureRequestStatus]>([['accepted'], ['in_progress']])(
    'skips the noisy intermediate state %s',
    (status) => {
      expect(crossProjectNotification({ id: 'fr1', title: 't', status })).toBeNull()
    },
  )

  it('omits the body when the request has no title', () => {
    const n = crossProjectNotification({ id: 'fr1', status: 'completed' })
    expect(n).toEqual({ title: 'Feature request completed', tag: 'cross-project:fr1' })
    expect(n && 'body' in n).toBe(false)
  })
})
