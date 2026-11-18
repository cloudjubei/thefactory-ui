import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewSourceStatus } from '../utils/colleagueReviewSourceTypes'

const api = vi.hoisted(() => ({
  readColleagueReviewSource: vi.fn(),
  watchColleagueReviewThread: vi.fn(),
  clearColleagueReviewThread: vi.fn(),
  setColleagueReviewSettings: vi.fn(),
}))

vi.mock('../api/colleagueReviewSourceApi', () => api)

import { ColleagueReviewSourceStore } from './colleagueReviewSourceStore'

const THREAD = 'https://acme.slack.com/archives/C07/p1763380000123456'
const OTHER = 'https://acme.slack.com/archives/C09/p1763390000000001'

const NONE: ReviewSourceStatus = {
  offering: 'ready',
  offers: { new: 0, started: 0, dismissed: 0 },
  settings: { skipTicketStatuses: [] },
}

const WATCHING: ReviewSourceStatus = {
  source: {
    provider: 'slack',
    connectionId: 'slack-1',
    permalink: THREAD,
    channel: 'C07',
    threadTs: '1763380000.123456',
    setAt: '2026-11-17T09:00:00.000Z',
  },
  connection: { id: 'slack-1', status: 'connected', teamName: 'Acme' },
  offering: 'ready',
  lastPoll: { at: '2026-11-17T11:58:00.000Z', outcome: 'read', replies: 1, offers: 1 },
  offers: { new: 2, started: 0, dismissed: 0 },
  settings: { skipTicketStatuses: ['Done'], startReaction: 'eyes' },
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const refusal = (status: number, error: string) => ({
  isAxiosError: true,
  response: { status, data: { error } },
})

function fakeWs() {
  const handlers = new Map<string, Set<(data: unknown) => void>>()
  const reconnects = new Set<() => void>()
  return {
    on: <T = unknown>(event: string, handler: (data: T) => void) => {
      const set = handlers.get(event) ?? new Set()
      const held = handler as (data: unknown) => void
      set.add(held)
      handlers.set(event, set)
      return () => {
        set.delete(held)
      }
    },
    onReconnect: (handler: () => void) => {
      reconnects.add(handler)
      return () => {
        reconnects.delete(handler)
      }
    },
    emit: (event: string, data?: unknown) => handlers.get(event)?.forEach((h) => h(data)),
    reconnect: () => reconnects.forEach((h) => h()),
    held: () => [...handlers.values()].reduce((n, set) => n + set.size, 0) + reconnects.size,
  }
}

const ready = async (store: ColleagueReviewSourceStore, group = 'osc') => {
  store.retain(group)
  await vi.waitFor(() => expect(store.snapshot(group).status).toBeDefined())
}

beforeEach(() => {
  api.readColleagueReviewSource.mockReset()
  api.watchColleagueReviewThread.mockReset()
  api.clearColleagueReviewThread.mockReset()
  api.setColleagueReviewSettings.mockReset()
})

describe('ColleagueReviewSourceStore', () => {
  it('reads a group’s thread once for every holder, and keeps the snapshot until it changes', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    const listener = vi.fn()
    store.listen('osc', listener)
    store.retain('osc')
    store.retain('osc')
    await vi.waitFor(() => expect(store.snapshot('osc').status).toBe(WATCHING))
    expect(api.readColleagueReviewSource).toHaveBeenCalledTimes(1)
    expect(api.readColleagueReviewSource).toHaveBeenCalledWith('osc')
    expect(listener).toHaveBeenCalled()
    expect(store.snapshot('osc')).toBe(store.snapshot('osc'))
    expect(store.snapshot('osc')).toEqual({
      status: WATCHING,
      readError: undefined,
      pending: undefined,
      actionError: undefined,
    })
  })

  it('is empty for a group nobody holds', () => {
    const store = new ColleagueReviewSourceStore(fakeWs())
    expect(store.snapshot('osc').status).toBeUndefined()
    expect(api.readColleagueReviewSource).not.toHaveBeenCalled()
  })

  it('reads again when the group’s thread changes, a connection changes, or the socket is back', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const ws = fakeWs()
    const store = new ColleagueReviewSourceStore(ws)
    await ready(store)
    ws.emit('colleagueReviews:updated', { groupId: 'osc', ticketKey: 'OSC-1' })
    ws.emit('colleagueReviews:updated', { groupId: 'other' })
    expect(api.readColleagueReviewSource).toHaveBeenCalledTimes(1)
    ws.emit('colleagueReviews:updated', { groupId: 'osc' })
    await vi.waitFor(() => expect(api.readColleagueReviewSource).toHaveBeenCalledTimes(2))
    ws.emit('providerConnections:updated', { action: 'update', id: 'slack-1' })
    await vi.waitFor(() => expect(api.readColleagueReviewSource).toHaveBeenCalledTimes(3))
    ws.reconnect()
    await vi.waitFor(() => expect(api.readColleagueReviewSource).toHaveBeenCalledTimes(4))
  })

  it('stops listening once the last holder lets go', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const ws = fakeWs()
    const store = new ColleagueReviewSourceStore(ws)
    const first = store.retain('osc')
    const second = store.retain('osc')
    await vi.waitFor(() => expect(store.snapshot('osc').status).toBe(WATCHING))
    first()
    expect(ws.held()).toBeGreaterThan(0)
    second()
    expect(ws.held()).toBe(0)
  })

  it('says why a read failed, keeping what it had', async () => {
    api.readColleagueReviewSource.mockResolvedValueOnce(WATCHING).mockRejectedValueOnce({})
    const ws = fakeWs()
    const store = new ColleagueReviewSourceStore(ws)
    await ready(store)
    await store.refresh('osc')
    expect(store.snapshot('osc')).toMatchObject({
      status: WATCHING,
      readError: 'Could not read what is watched.',
    })
  })

  it('shows a thread watched at once, once however often it is pressed, then what the backend says', async () => {
    api.readColleagueReviewSource.mockResolvedValue(NONE)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    const saving = deferred<ReviewSourceStatus>()
    api.watchColleagueReviewThread.mockReturnValue(saving.promise)
    const going = store.watch('osc', { connectionId: 'slack-1', permalink: THREAD })
    expect(store.snapshot('osc').pending).toEqual({
      kind: 'watch',
      connectionId: 'slack-1',
      permalink: THREAD,
    })
    await store.watch('osc', { connectionId: 'slack-1', permalink: OTHER })
    expect(api.watchColleagueReviewThread).toHaveBeenCalledTimes(1)
    expect(api.watchColleagueReviewThread).toHaveBeenCalledWith('osc', {
      connectionId: 'slack-1',
      permalink: THREAD,
    })
    saving.resolve(WATCHING)
    await going
    expect(store.snapshot('osc')).toMatchObject({ status: WATCHING, pending: undefined })
  })

  it('keeps the backend’s answer over a read begun before it', async () => {
    const reading = deferred<ReviewSourceStatus>()
    api.readColleagueReviewSource.mockResolvedValueOnce(NONE).mockReturnValueOnce(reading.promise)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    const stale = store.refresh('osc')
    api.watchColleagueReviewThread.mockResolvedValue(WATCHING)
    await store.watch('osc', { connectionId: 'slack-1', permalink: THREAD })
    reading.resolve(NONE)
    await stale
    expect(store.snapshot('osc').status).toBe(WATCHING)
  })

  it('rolls a watch back with the backend’s reason, and clears it on the next change', async () => {
    api.readColleagueReviewSource.mockResolvedValue(NONE)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    api.watchColleagueReviewThread.mockRejectedValueOnce(
      refusal(502, 'Slack cannot read that thread: not_in_channel.'),
    )
    await store.watch('osc', { connectionId: 'slack-1', permalink: THREAD })
    expect(store.snapshot('osc')).toMatchObject({
      status: NONE,
      pending: undefined,
      actionError: 'Slack cannot read that thread: not_in_channel.',
    })
    api.watchColleagueReviewThread.mockRejectedValueOnce({})
    const again = store.watch('osc', { connectionId: 'slack-1', permalink: THREAD })
    expect(store.snapshot('osc').actionError).toBeUndefined()
    await again
    expect(store.snapshot('osc').actionError).toBe('That link is not watched.')
  })

  it('clears a thread at once, and brings it back when the backend refuses', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    const clearing = deferred<ReviewSourceStatus>()
    api.clearColleagueReviewThread.mockReturnValueOnce(clearing.promise)
    const going = store.clear('osc')
    expect(store.snapshot('osc').pending).toEqual({ kind: 'clear' })
    await store.clear('osc')
    expect(api.clearColleagueReviewThread).toHaveBeenCalledTimes(1)
    clearing.resolve({ ...NONE, offers: WATCHING.offers })
    await going
    expect(store.snapshot('osc').status?.source).toBeUndefined()
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    await store.refresh('osc')
    api.clearColleagueReviewThread.mockRejectedValueOnce({})
    await store.clear('osc')
    expect(store.snapshot('osc')).toMatchObject({
      status: WATCHING,
      actionError: 'It is still watched.',
    })
  })

  it('takes an update the person settled off the waiting count at once, until a read after it', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    const settling = deferred<boolean>()
    void store.settleOffer('osc', 'o1', settling.promise)
    await store.settleOffer('osc', 'o1', Promise.resolve(false))
    expect(store.snapshot('osc').status?.offers.new).toBe(1)
    const reading = deferred<ReviewSourceStatus>()
    api.readColleagueReviewSource.mockReturnValueOnce(reading.promise)
    const stale = store.refresh('osc')
    settling.resolve(true)
    await Promise.resolve()
    reading.resolve(WATCHING)
    await stale
    expect(store.snapshot('osc').status?.offers.new).toBe(1)
    api.readColleagueReviewSource.mockResolvedValueOnce({
      ...WATCHING,
      offers: { new: 1, started: 0, dismissed: 1 },
    })
    await store.refresh('osc')
    expect(store.snapshot('osc').status?.offers.new).toBe(1)
  })

  it('counts an update again when settling it failed', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    await store.settleOffer('osc', 'o1', Promise.resolve(false))
    await store.settleOffer('osc', 'o2', Promise.reject(new Error('down')))
    expect(store.snapshot('osc').status?.offers.new).toBe(2)
  })

  it('shows a settings change at once, once however often it is pressed, then what the backend says', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    const saving = deferred<ReviewSourceStatus>()
    api.setColleagueReviewSettings.mockReturnValueOnce(saving.promise)
    const going = store.setSettings('osc', { skipTicketStatuses: ['Done', 'QA'] })
    expect(store.snapshot('osc').status?.settings).toEqual({
      skipTicketStatuses: ['Done', 'QA'],
      startReaction: 'eyes',
    })
    await store.setSettings('osc', { skipTicketStatuses: ['Done', 'QA'] })
    expect(api.setColleagueReviewSettings).toHaveBeenCalledTimes(1)
    expect(api.setColleagueReviewSettings).toHaveBeenCalledWith('osc', {
      skipTicketStatuses: ['Done', 'QA'],
    })
    const saved = { ...WATCHING, settings: { skipTicketStatuses: ['Done', 'QA'] } }
    saving.resolve(saved)
    await going
    expect(store.snapshot('osc')).toMatchObject({ status: saved, actionError: undefined })
  })

  it('sends nothing for a setting that is set already', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    await store.setSettings('osc', { startReaction: 'eyes' })
    await store.setSettings('osc', { skipTicketStatuses: ['Done'], runChecksUnasked: false })
    expect(api.setColleagueReviewSettings).not.toHaveBeenCalled()
  })

  it('keeps a second setting shown while the first one’s answer comes back', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    const first = deferred<ReviewSourceStatus>()
    const second = deferred<ReviewSourceStatus>()
    api.setColleagueReviewSettings
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const going = store.setSettings('osc', { startReaction: '' })
    const toggling = store.setSettings('osc', { runChecksUnasked: true })
    expect(api.setColleagueReviewSettings).toHaveBeenCalledTimes(2)
    first.resolve({ ...WATCHING, settings: { skipTicketStatuses: ['Done'] } })
    await going
    expect(store.snapshot('osc').status?.settings).toEqual({
      skipTicketStatuses: ['Done'],
      runChecksUnasked: true,
    })
    second.resolve({
      ...WATCHING,
      settings: { skipTicketStatuses: ['Done'], runChecksUnasked: true },
    })
    await toggling
    expect(store.snapshot('osc').status?.settings).toEqual({
      skipTicketStatuses: ['Done'],
      runChecksUnasked: true,
    })
  })

  it('keeps the backend’s settings over a read begun before them', async () => {
    const reading = deferred<ReviewSourceStatus>()
    api.readColleagueReviewSource
      .mockResolvedValueOnce(WATCHING)
      .mockReturnValueOnce(reading.promise)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    const stale = store.refresh('osc')
    const saved = { ...WATCHING, settings: { ...WATCHING.settings, runChecksUnasked: true } }
    api.setColleagueReviewSettings.mockResolvedValueOnce(saved)
    await store.setSettings('osc', { runChecksUnasked: true })
    reading.resolve(WATCHING)
    await stale
    expect(store.snapshot('osc').status).toBe(saved)
  })

  it('rolls a refused setting back with the backend’s reason, and clears it on the next change', async () => {
    api.readColleagueReviewSource.mockResolvedValue(WATCHING)
    const store = new ColleagueReviewSourceStore(fakeWs())
    await ready(store)
    api.setColleagueReviewSettings.mockRejectedValueOnce(
      refusal(400, 'The reaction must be an emoji name, like eyes.'),
    )
    await store.setSettings('osc', { startReaction: 'not an emoji' })
    expect(store.snapshot('osc')).toMatchObject({
      status: WATCHING,
      actionError: 'The reaction must be an emoji name, like eyes.',
    })
    api.setColleagueReviewSettings.mockRejectedValueOnce({})
    const again = store.setSettings('osc', { runChecksUnasked: true })
    expect(store.snapshot('osc').actionError).toBeUndefined()
    expect(store.snapshot('osc').status?.settings.runChecksUnasked).toBe(true)
    await again
    expect(store.snapshot('osc').actionError).toBe('The setting was not saved.')
    expect(store.snapshot('osc').status?.settings.runChecksUnasked).toBeUndefined()
  })
})
