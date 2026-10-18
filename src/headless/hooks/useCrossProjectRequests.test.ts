import { beforeEach, describe, expect, it, vi } from 'vitest'

const listFeatureRequests = vi.fn()
const markFeatureRequestDelivered = vi.fn()
const handOverFeatureRequest = vi.fn()

vi.mock('../api/generated', () => ({
  listFeatureRequests: (...args: unknown[]) => listFeatureRequests(...args),
  acceptFeatureRequest: vi.fn(),
  rejectFeatureRequest: vi.fn(),
  markFeatureRequestDelivered: (...args: unknown[]) => markFeatureRequestDelivered(...args),
  handOverFeatureRequest: (...args: unknown[]) => handOverFeatureRequest(...args),
}))
vi.mock('../api/ApiContext', () => ({ useApi: vi.fn() }))

import { featureRequestsSnapshot, replaceFeatureRequests } from './featureRequestsStore'
import {
  handOverRequest,
  holdFeatureRequests,
  markRequestDelivered,
} from './useCrossProjectRequests'

type Handler = (data: unknown) => void

class FakeWs {
  readonly handlers = new Map<string, Set<Handler>>()

  on(event: string, handler: Handler): () => void {
    const set = this.handlers.get(event) ?? new Set<Handler>()
    set.add(handler)
    this.handlers.set(event, set)
    return () => set.delete(handler)
  }

  emit(event: string, data: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) handler(data)
  }

  count(event: string): number {
    return this.handlers.get(event)?.size ?? 0
  }
}

const request = (id: string) => ({ id, status: 'pending', updatedAt: '2026-10-13T00:00:00Z' })

describe('holdFeatureRequests', () => {
  beforeEach(() => {
    listFeatureRequests.mockReset()
    listFeatureRequests.mockResolvedValue({ data: [request('fr-1')] })
    replaceFeatureRequests([])
  })

  it('reads the requests once and listens once, however many views hold them', async () => {
    const ws = new FakeWs()
    const releases = [holdFeatureRequests(ws), holdFeatureRequests(ws), holdFeatureRequests(ws)]
    expect(listFeatureRequests).toHaveBeenCalledTimes(1)
    expect(ws.count('featureRequest:updated')).toBe(1)
    await Promise.resolve()
    await Promise.resolve()
    expect(Object.keys(featureRequestsSnapshot())).toEqual(['fr-1'])
    for (const release of releases) release()
  })

  it('keeps the requests current while held, and stops listening when the last view lets go', () => {
    const ws = new FakeWs()
    const releaseA = holdFeatureRequests(ws)
    const releaseB = holdFeatureRequests(ws)
    ws.emit('featureRequest:updated', request('fr-2'))
    expect(featureRequestsSnapshot()['fr-2']).toBeDefined()
    releaseA()
    releaseA()
    expect(ws.count('featureRequest:updated')).toBe(1)
    releaseB()
    expect(ws.count('featureRequest:updated')).toBe(0)
  })

  it('reads again when held after every view let go — it may have missed changes meanwhile', () => {
    const ws = new FakeWs()
    holdFeatureRequests(ws)()
    holdFeatureRequests(ws)()
    expect(listFeatureRequests).toHaveBeenCalledTimes(2)
  })

  it('keeps what it had when the read fails', async () => {
    replaceFeatureRequests([request('kept') as never])
    listFeatureRequests.mockRejectedValueOnce(new Error('down'))
    const release = holdFeatureRequests(new FakeWs())
    await Promise.resolve()
    await Promise.resolve()
    expect(Object.keys(featureRequestsSnapshot())).toEqual(['kept'])
    release()
  })
})

describe('settling a request elsewhere', () => {
  beforeEach(() => {
    replaceFeatureRequests([])
    markFeatureRequestDelivered.mockReset()
    handOverFeatureRequest.mockReset()
  })

  it('marks a request delivered with the reference trimmed, and keeps the answer', async () => {
    const delivered = { ...request('fr-1'), status: 'completed' }
    markFeatureRequestDelivered.mockResolvedValue({ data: delivered })
    expect(await markRequestDelivered('fr-1', { ref: ' a1b2c3d ', note: ' Same change ' })).toBe(
      delivered,
    )
    expect(markFeatureRequestDelivered).toHaveBeenCalledWith({
      path: { id: 'fr-1' },
      body: { ref: 'a1b2c3d', note: 'Same change' },
      throwOnError: true,
    })
    expect(featureRequestsSnapshot()['fr-1']).toBe(delivered)
  })

  it('leaves a blank note out', async () => {
    markFeatureRequestDelivered.mockResolvedValue({ data: undefined })
    await markRequestDelivered('fr-1', { ref: 'x', note: '  ' })
    expect(markFeatureRequestDelivered.mock.calls[0][0].body).toEqual({ ref: 'x' })
    expect(featureRequestsSnapshot()).toEqual({})
  })

  it('hands a request over with each part trimmed, and keeps the answer', async () => {
    const handed = { ...request('fr-1'), status: 'handed_over' }
    handOverFeatureRequest.mockResolvedValue({ data: handed })
    await handOverRequest('fr-1', { projectId: ' backend ', ref: ' fr-9 ', note: '' })
    expect(handOverFeatureRequest).toHaveBeenCalledWith({
      path: { id: 'fr-1' },
      body: { projectId: 'backend', ref: 'fr-9' },
      throwOnError: true,
    })
    expect(featureRequestsSnapshot()['fr-1']).toBe(handed)
  })
})
