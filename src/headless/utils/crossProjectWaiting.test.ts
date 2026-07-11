import { describe, expect, it } from 'vitest'
import type { FeatureRequestStatus } from 'thefactory-tools/types'
import {
  summarizeCrossProjectWaiting,
  type CrossProjectWaitingRequest,
} from './crossProjectWaiting'

function req(
  over: Partial<CrossProjectWaitingRequest> & { id: string },
): CrossProjectWaitingRequest {
  return { targetProjectId: 'projB', status: 'accepted', ...over }
}

describe('summarizeCrossProjectWaiting', () => {
  it('returns null when nothing is in flight', () => {
    expect(summarizeCrossProjectWaiting([])).toBeNull()
  })

  it('summarises a single waiting request by its target project', () => {
    const view = summarizeCrossProjectWaiting([req({ id: 'fr1', status: 'in_progress' })])
    expect(view).toEqual({
      count: 1,
      targets: ['projB'],
      cycle: false,
      tone: 'waiting',
      title: 'Waiting on projB',
      items: [{ id: 'fr1', targetProjectId: 'projB', status: 'in_progress' }],
    })
  })

  it('counts distinct target projects, not raw request rows', () => {
    const view = summarizeCrossProjectWaiting([
      req({ id: 'fr1', targetProjectId: 'projB' }),
      req({ id: 'fr2', targetProjectId: 'projC' }),
    ])
    expect(view?.count).toBe(2)
    expect(view?.targets).toEqual(['projB', 'projC'])
    expect(view?.title).toBe('Waiting on 2 projects')
    expect(view?.items).toHaveLength(2)
  })

  it('collapses multiple requests to the same target into one project', () => {
    const view = summarizeCrossProjectWaiting([
      req({ id: 'fr1', targetProjectId: 'projB' }),
      req({ id: 'fr2', targetProjectId: 'projB' }),
    ])
    expect(view?.count).toBe(1)
    expect(view?.targets).toEqual(['projB'])
    expect(view?.title).toBe('Waiting on projB')
    expect(view?.items).toHaveLength(2)
  })

  it('flags a deadlock cycle in tone and title for a single target', () => {
    const view = summarizeCrossProjectWaiting([req({ id: 'fr1', cycleFlag: { detected: true } })])
    expect(view?.cycle).toBe(true)
    expect(view?.tone).toBe('cycle')
    expect(view?.title).toBe('Waiting on projB — possible deadlock')
  })

  it('flags a deadlock cycle across multiple targets', () => {
    const view = summarizeCrossProjectWaiting([
      req({ id: 'fr1', targetProjectId: 'projB', cycleFlag: { detected: true } }),
      req({ id: 'fr2', targetProjectId: 'projC' }),
    ])
    expect(view?.tone).toBe('cycle')
    expect(view?.title).toBe('Waiting on 2 projects — possible deadlock')
  })

  it('preserves each request status verbatim in items', () => {
    const statuses: FeatureRequestStatus[] = ['pending', 'accepted', 'in_progress', 'in_review']
    const view = summarizeCrossProjectWaiting(
      statuses.map((status, i) => req({ id: `fr${i}`, targetProjectId: `p${i}`, status })),
    )
    expect(view?.items.map((it) => it.status)).toEqual(statuses)
  })
})
