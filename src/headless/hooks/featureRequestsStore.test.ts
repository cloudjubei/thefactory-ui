import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureRequest, FeatureRequestStatus } from 'thefactory-tools/types'
import {
  badgeCount,
  featureRequestsSnapshot,
  inFlightCount,
  inboxFor,
  outboxFor,
  pendingCount,
  replaceFeatureRequests,
  sortedRequests,
  subscribeFeatureRequests,
  upsertFeatureRequest,
} from './featureRequestsStore'

function fr(overrides: Partial<FeatureRequest> = {}): FeatureRequest {
  return {
    id: 'fr1',
    title: 'Add rate limiting',
    description: 'Protect the API.',
    targetProjectId: 'projB',
    requestedBy: {
      fromProjectId: 'projA',
      fromChatContext: { type: 'PROJECT', projectId: 'projA' },
    },
    acceptance: 'manual',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as FeatureRequest
}

beforeEach(() => {
  // The store is a module singleton; reset it to empty between tests.
  replaceFeatureRequests([])
})

describe('featureRequestsStore', () => {
  it('upserts a request keyed by id', () => {
    upsertFeatureRequest(fr({ id: 'a' }))
    expect(Object.keys(featureRequestsSnapshot())).toEqual(['a'])
  })

  it('replaces an existing request by id (later status wins)', () => {
    upsertFeatureRequest(fr({ id: 'a', status: 'pending' }))
    upsertFeatureRequest(fr({ id: 'a', status: 'in_review' }))
    expect(featureRequestsSnapshot()['a'].status).toBe('in_review')
    expect(Object.keys(featureRequestsSnapshot())).toHaveLength(1)
  })

  it('ignores a malformed record with no string id', () => {
    upsertFeatureRequest({ status: 'pending' } as unknown as FeatureRequest)
    expect(Object.keys(featureRequestsSnapshot())).toHaveLength(0)
  })

  it('replaceFeatureRequests replaces the whole map', () => {
    upsertFeatureRequest(fr({ id: 'a' }))
    replaceFeatureRequests([fr({ id: 'b' }), fr({ id: 'c' })])
    expect(Object.keys(featureRequestsSnapshot()).sort()).toEqual(['b', 'c'])
  })

  it('keeps a stable snapshot reference until the next change', () => {
    const s1 = featureRequestsSnapshot()
    expect(featureRequestsSnapshot()).toBe(s1)
    upsertFeatureRequest(fr({ id: 'a' }))
    expect(featureRequestsSnapshot()).not.toBe(s1)
  })

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const listener = vi.fn()
    const unsub = subscribeFeatureRequests(listener)
    upsertFeatureRequest(fr({ id: 'a' }))
    expect(listener).toHaveBeenCalledTimes(1)
    unsub()
    upsertFeatureRequest(fr({ id: 'b' }))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  describe('selectors', () => {
    const seed = () =>
      replaceFeatureRequests([
        fr({ id: 'p', status: 'pending' }),
        fr({ id: 'acc', status: 'accepted' }),
        fr({ id: 'prog', status: 'in_progress' }),
        fr({ id: 'rev', status: 'in_review' }),
        fr({ id: 'done', status: 'completed' }),
        fr({ id: 'fail', status: 'failed' }),
        fr({ id: 'rej', status: 'rejected' }),
      ])

    it('pendingCount counts only pending', () => {
      seed()
      expect(pendingCount(featureRequestsSnapshot())).toBe(1)
    })

    it('inFlightCount counts accepted + in_progress + in_review', () => {
      seed()
      expect(inFlightCount(featureRequestsSnapshot())).toBe(3)
    })

    it('badgeCount = pending + in-flight (every non-terminal request)', () => {
      seed()
      expect(badgeCount(featureRequestsSnapshot())).toBe(4)
    })

    it.each<[FeatureRequestStatus]>([['completed'], ['failed'], ['rejected']])(
      'excludes the terminal status %s from the badge',
      (status) => {
        replaceFeatureRequests([fr({ id: 'x', status })])
        expect(badgeCount(featureRequestsSnapshot())).toBe(0)
      },
    )

    it('sortedRequests orders by updatedAt descending', () => {
      replaceFeatureRequests([
        fr({ id: 'old', updatedAt: '2026-01-01T00:00:00.000Z' }),
        fr({ id: 'new', updatedAt: '2026-03-01T00:00:00.000Z' }),
        fr({ id: 'mid', updatedAt: '2026-02-01T00:00:00.000Z' }),
      ])
      expect(sortedRequests(featureRequestsSnapshot()).map((r) => r.id)).toEqual([
        'new',
        'mid',
        'old',
      ])
    })

    it('outboxFor filters by sender project', () => {
      replaceFeatureRequests([
        fr({
          id: 'a',
          requestedBy: {
            fromProjectId: 'projA',
            fromChatContext: { type: 'PROJECT', projectId: 'projA' },
          },
        }),
        fr({
          id: 'b',
          requestedBy: {
            fromProjectId: 'projX',
            fromChatContext: { type: 'PROJECT', projectId: 'projX' },
          },
        }),
      ])
      expect(outboxFor(featureRequestsSnapshot(), 'projA').map((r) => r.id)).toEqual(['a'])
    })

    it('inboxFor filters by target project', () => {
      replaceFeatureRequests([
        fr({ id: 'a', targetProjectId: 'projB' }),
        fr({ id: 'b', targetProjectId: 'projC' }),
      ])
      expect(inboxFor(featureRequestsSnapshot(), 'projB').map((r) => r.id)).toEqual(['a'])
    })
  })
})
