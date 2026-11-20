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
vi.mock('../api/ApiContext', () => ({ useApi: vi.fn(), useOptionalApi: () => null }))

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

  readonly reconnectHandlers = new Set<() => void>()

  onReconnect(handler: () => void): () => void {
    this.reconnectHandlers.add(handler)
    return () => this.reconnectHandlers.delete(handler)
  }

  reconnect(): void {
    for (const handler of this.reconnectHandlers) handler()
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

  it('reads again after the socket reconnects while held — updates sent meanwhile were missed', () => {
    const ws = new FakeWs()
    const releaseA = holdFeatureRequests(ws)
    const releaseB = holdFeatureRequests(ws)
    expect(listFeatureRequests).toHaveBeenCalledTimes(1)
    ws.reconnect()
    expect(listFeatureRequests).toHaveBeenCalledTimes(2)
    releaseA()
    releaseB()
    ws.reconnect()
    expect(listFeatureRequests).toHaveBeenCalledTimes(2)
    expect(ws.reconnectHandlers.size).toBe(0)
  })

  it('keeps an update that arrives while a read is in flight over the older listed copy', async () => {
    let resolveList: (value: { data: unknown[] }) => void = () => {}
    listFeatureRequests.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve
      }),
    )
    const ws = new FakeWs()
    const release = holdFeatureRequests(ws)
    ws.emit('featureRequest:updated', {
      ...request('fr-1'),
      status: 'in_progress',
      updatedAt: '2026-10-13T00:05:00Z',
    })
    ws.emit('featureRequest:updated', { ...request('fr-new'), updatedAt: '2026-10-13T00:06:00Z' })
    resolveList({ data: [request('fr-1'), request('fr-2')] })
    await Promise.resolve()
    await Promise.resolve()
    const snapshot = featureRequestsSnapshot()
    expect(snapshot['fr-1']?.status).toBe('in_progress')
    expect(Object.keys(snapshot).sort()).toEqual(['fr-1', 'fr-2', 'fr-new'])
    release()
  })

  it('takes the listed copy when it is newer than an update seen while the read was in flight', async () => {
    let resolveList: (value: { data: unknown[] }) => void = () => {}
    listFeatureRequests.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve
      }),
    )
    const ws = new FakeWs()
    const release = holdFeatureRequests(ws)
    ws.emit('featureRequest:updated', { ...request('fr-1'), status: 'accepted' })
    resolveList({
      data: [{ ...request('fr-1'), status: 'completed', updatedAt: '2026-10-13T00:09:00Z' }],
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(featureRequestsSnapshot()['fr-1']?.status).toBe('completed')
    release()
  })

  it('drops a record the list no longer has when nothing changed it during the read', async () => {
    replaceFeatureRequests([request('gone') as never])
    const ws = new FakeWs()
    const release = holdFeatureRequests(ws)
    await Promise.resolve()
    await Promise.resolve()
    expect(Object.keys(featureRequestsSnapshot())).toEqual(['fr-1'])
    release()
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
