import { describe, expect, it } from 'vitest'

import { unseenFinishedForScope, type ActivityLite } from './activitiesStore'

const SINCE = '2026-11-10T00:00:00Z'

function activity(over: Partial<ActivityLite> = {}): ActivityLite {
  return { activityId: 'a', scope: 'p1', status: 'completed', live: false, ...over }
}

describe('unseenFinishedForScope', () => {
  const snapshot = {
    p1: [
      activity({ activityId: 'new', finishedAt: '2026-11-11T00:37:45Z' }),
      activity({ activityId: 'failed', status: 'failed', finishedAt: '2026-11-10T09:53:37Z' }),
      activity({ activityId: 'old', finishedAt: '2026-11-09T09:00:00Z' }),
      activity({ activityId: 'running', status: 'running' }),
    ],
  }

  it('counts what finished since the App tab was last opened, in a project with an App tab', () => {
    expect(unseenFinishedForScope(snapshot, 'p1', SINCE, true)).toBe(2)
  })

  it('counts nothing in a project without an App tab: there is nowhere to see it', () => {
    expect(unseenFinishedForScope(snapshot, 'p1', SINCE, false)).toBe(0)
  })

  it('counts nothing without a scope, without a baseline, or for a scope with no activities', () => {
    expect(unseenFinishedForScope(snapshot, undefined, SINCE, true)).toBe(0)
    expect(unseenFinishedForScope(snapshot, 'p1', undefined, true)).toBe(0)
    expect(unseenFinishedForScope(snapshot, 'p2', SINCE, true)).toBe(0)
  })
})
