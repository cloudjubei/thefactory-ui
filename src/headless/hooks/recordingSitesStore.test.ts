import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecordingSiteState } from 'thefactory-tools/types'

const api = vi.hoisted(() => ({
  listRecordingSites: vi.fn(),
  startRecordingSiteSignIn: vi.fn(),
}))

vi.mock('../api/recordingSitesApi', () => api)

import { RECORDING_SITES_EVENT, RECORDING_SITES_TEXT } from '../utils/recordingSitesConstants'
import { RecordingSitesStore } from './recordingSitesStore'

const LOOM: RecordingSiteState = { id: 'loom', name: 'Loom', state: 'unknown', signingIn: false }
const FATHOM: RecordingSiteState = {
  id: 'fathom',
  name: 'Fathom',
  state: 'signed-out',
  signingIn: false,
}
const OPEN: RecordingSiteState = { ...LOOM, signingIn: true }
const SIGNED_IN: RecordingSiteState = {
  ...LOOM,
  state: 'signed-in',
  checkedAt: '2026-11-26T12:00:00.000Z',
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
  const reconnects = new Set<() => void>()
  const handlers = new Map<string, Set<(data: unknown) => void>>()
  return {
    on: <T = unknown>(event: string, handler: (data: T) => void) => {
      const set = handlers.get(event) ?? new Set()
      const held = handler as (data: unknown) => void
      handlers.set(event, set)
      set.add(held)
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
    emit: (event: string, data: unknown) => handlers.get(event)?.forEach((h) => h(data)),
    reconnect: () => reconnects.forEach((h) => h()),
    held: () => reconnects.size + [...handlers.values()].reduce((n, set) => n + set.size, 0),
  }
}

const loom = (store: RecordingSitesStore) =>
  store.snapshot().sites?.find((site) => site.id === 'loom')

const shownLoom = (store: RecordingSitesStore) => ({
  signingIn: loom(store)?.signingIn || store.snapshot().starting.includes('loom'),
  state: loom(store)?.state,
})

const ready = async (store: RecordingSitesStore) => {
  store.retain()
  await vi.waitFor(() => expect(store.snapshot().sites).toBeDefined())
}

beforeEach(() => {
  api.listRecordingSites.mockReset()
  api.startRecordingSiteSignIn.mockReset()
  api.listRecordingSites.mockResolvedValue([LOOM, FATHOM])
})

describe('RecordingSitesStore', () => {
  it('reads the sites once for every holder, and keeps the snapshot until it changes', async () => {
    const store = new RecordingSitesStore(fakeWs())
    const listener = vi.fn()
    const unlisten = store.listen(listener)
    store.retain()
    store.retain()
    await vi.waitFor(() => expect(store.snapshot().sites).toEqual([LOOM, FATHOM]))
    expect(api.listRecordingSites).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalled()
    expect(store.snapshot()).toBe(store.snapshot())
    expect(store.snapshot()).toEqual({
      sites: [LOOM, FATHOM],
      readError: undefined,
      starting: [],
      failed: {},
    })
    const told = listener.mock.calls.length
    unlisten()
    await store.refresh()
    expect(listener).toHaveBeenCalledTimes(told)
  })

  it('is empty before anybody holds it', () => {
    const store = new RecordingSitesStore(fakeWs())
    expect(store.snapshot()).toEqual({
      sites: undefined,
      readError: undefined,
      starting: [],
      failed: {},
    })
    expect(api.listRecordingSites).not.toHaveBeenCalled()
  })

  it('reads again when the socket is back, and stops listening once the last holder lets go', async () => {
    const ws = fakeWs()
    const store = new RecordingSitesStore(ws)
    const first = store.retain()
    const second = store.retain()
    await vi.waitFor(() => expect(api.listRecordingSites).toHaveBeenCalledTimes(1))
    ws.reconnect()
    await vi.waitFor(() => expect(api.listRecordingSites).toHaveBeenCalledTimes(2))
    first()
    first()
    expect(ws.held()).toBe(2)
    second()
    expect(ws.held()).toBe(0)
    store.retain()
    await vi.waitFor(() => expect(api.listRecordingSites).toHaveBeenCalledTimes(3))
    expect(ws.held()).toBe(2)
  })

  it('says why a read failed, and forgets it once one answers', async () => {
    api.listRecordingSites.mockRejectedValueOnce(refusal(500, 'No profile folder'))
    const store = new RecordingSitesStore(fakeWs())
    store.retain()
    await vi.waitFor(() => expect(store.snapshot().readError).toBe('No profile folder'))
    await store.refresh()
    expect(store.snapshot()).toMatchObject({ sites: [LOOM, FATHOM], readError: undefined })
  })

  it('falls back to its own words when a failed read gives none', async () => {
    api.listRecordingSites.mockRejectedValueOnce(new Error(''))
    const store = new RecordingSitesStore(fakeWs())
    store.retain()
    await vi.waitFor(() => expect(store.snapshot().readError).toBe(RECORDING_SITES_TEXT.readFailed))
  })

  it('shows a sign-in at once, asks once however often it is pressed, and keeps the backend’s answer', async () => {
    const answer = deferred<RecordingSiteState>()
    api.startRecordingSiteSignIn.mockReturnValue(answer.promise)
    const store = new RecordingSitesStore(fakeWs())
    await ready(store)
    const listener = vi.fn()
    store.listen(listener)

    const going = store.signIn('loom')
    expect(store.snapshot().starting).toEqual(['loom'])
    expect(listener).toHaveBeenCalledTimes(1)
    await store.signIn('loom')
    await store.signIn('loom')
    expect(api.startRecordingSiteSignIn).toHaveBeenCalledTimes(1)
    expect(api.startRecordingSiteSignIn).toHaveBeenCalledWith('loom')

    answer.resolve(OPEN)
    await going
    expect(store.snapshot()).toMatchObject({ sites: [OPEN, FATHOM], starting: [], failed: {} })

    await store.signIn('loom')
    expect(api.startRecordingSiteSignIn).toHaveBeenCalledTimes(1)
  })

  it('asks for nothing before the sites are read, or for a site it does not list', async () => {
    const store = new RecordingSitesStore(fakeWs())
    await store.signIn('loom')
    await ready(store)
    await store.signIn('vimeo')
    expect(api.startRecordingSiteSignIn).not.toHaveBeenCalled()
    expect(store.snapshot().starting).toEqual([])
  })

  it('signs in to two sites side by side', async () => {
    const first = deferred<RecordingSiteState>()
    const second = deferred<RecordingSiteState>()
    api.startRecordingSiteSignIn
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const store = new RecordingSitesStore(fakeWs())
    await ready(store)
    const a = store.signIn('loom')
    const b = store.signIn('fathom')
    expect(store.snapshot().starting).toEqual(['loom', 'fathom'])
    first.resolve(OPEN)
    await a
    expect(store.snapshot().starting).toEqual(['fathom'])
    second.reject(refusal(502, 'No browser on this machine'))
    await b
    expect(store.snapshot()).toMatchObject({
      sites: [OPEN, FATHOM],
      starting: [],
      failed: { fathom: 'No browser on this machine' },
    })
  })

  it('rolls a refused sign-in back with why, and clears why on the next press', async () => {
    api.startRecordingSiteSignIn.mockRejectedValueOnce(refusal(502, 'No browser on this machine'))
    const store = new RecordingSitesStore(fakeWs())
    await ready(store)

    await store.signIn('loom')
    expect(shownLoom(store)).toEqual({ signingIn: false, state: 'unknown' })
    expect(store.snapshot().failed).toEqual({ loom: 'No browser on this machine' })

    const answer = deferred<RecordingSiteState>()
    api.startRecordingSiteSignIn.mockReturnValueOnce(answer.promise)
    const again = store.signIn('loom')
    expect(store.snapshot().failed).toEqual({})
    expect(shownLoom(store).signingIn).toBe(true)
    answer.resolve(OPEN)
    await again
    expect(api.startRecordingSiteSignIn).toHaveBeenCalledTimes(2)
  })

  it('falls back to its own words when a refused sign-in gives none', async () => {
    api.startRecordingSiteSignIn.mockRejectedValueOnce(new Error(''))
    const store = new RecordingSitesStore(fakeWs())
    await ready(store)
    await store.signIn('loom')
    expect(store.snapshot().failed).toEqual({ loom: RECORDING_SITES_TEXT.signInFailed })
  })

  it('follows the backend’s word of a site: its window opening, the sign-in, the window closing', async () => {
    const ws = fakeWs()
    const store = new RecordingSitesStore(ws)
    await ready(store)
    const listener = vi.fn()
    store.listen(listener)

    ws.emit(RECORDING_SITES_EVENT, { site: OPEN })
    expect(store.snapshot().sites).toEqual([OPEN, FATHOM])
    expect(listener).toHaveBeenCalledTimes(1)
    ws.emit(RECORDING_SITES_EVENT, { site: SIGNED_IN })
    expect(store.snapshot().sites).toEqual([SIGNED_IN, FATHOM])
    ws.emit(RECORDING_SITES_EVENT, { site: { ...FATHOM, state: 'signed-in' } })
    expect(store.snapshot().sites).toEqual([SIGNED_IN, { ...FATHOM, state: 'signed-in' }])
    expect(api.listRecordingSites).toHaveBeenCalledTimes(1)
  })

  it('offers the sign-in again once the window closed without one', async () => {
    const ws = fakeWs()
    api.startRecordingSiteSignIn.mockResolvedValue(OPEN)
    const store = new RecordingSitesStore(ws)
    await ready(store)
    await store.signIn('loom')
    ws.emit(RECORDING_SITES_EVENT, { site: { ...LOOM, state: 'signed-out' } })
    expect(shownLoom(store)).toEqual({ signingIn: false, state: 'signed-out' })
    await store.signIn('loom')
    expect(api.startRecordingSiteSignIn).toHaveBeenCalledTimes(2)
  })

  it('reads the sites again on an event it cannot read', async () => {
    const ws = fakeWs()
    const store = new RecordingSitesStore(ws)
    await ready(store)
    api.listRecordingSites.mockResolvedValue([SIGNED_IN, FATHOM])
    ws.emit(RECORDING_SITES_EVENT, { site: { id: 'loom' } })
    await vi.waitFor(() => expect(store.snapshot().sites).toEqual([SIGNED_IN, FATHOM]))
    expect(api.listRecordingSites).toHaveBeenCalledTimes(2)
  })

  it('keeps what an event told over the answer to a sign-in asked before it', async () => {
    const ws = fakeWs()
    const answer = deferred<RecordingSiteState>()
    api.startRecordingSiteSignIn.mockReturnValue(answer.promise)
    const store = new RecordingSitesStore(ws)
    await ready(store)

    const going = store.signIn('loom')
    ws.emit(RECORDING_SITES_EVENT, { site: SIGNED_IN })
    expect(store.snapshot().starting).toEqual(['loom'])
    answer.resolve(OPEN)
    await going
    expect(store.snapshot()).toMatchObject({ sites: [SIGNED_IN, FATHOM], starting: [] })
  })

  it('takes the sign-in’s answer when the event in between was about another site', async () => {
    const ws = fakeWs()
    const answer = deferred<RecordingSiteState>()
    api.startRecordingSiteSignIn.mockReturnValue(answer.promise)
    const store = new RecordingSitesStore(ws)
    await ready(store)

    const going = store.signIn('loom')
    ws.emit(RECORDING_SITES_EVENT, { site: { ...FATHOM, state: 'signed-in' } })
    answer.resolve(OPEN)
    await going
    expect(store.snapshot().sites).toEqual([OPEN, { ...FATHOM, state: 'signed-in' }])
  })

  it('keeps why each site’s sign-in failed, until the backend tells of the site', async () => {
    const ws = fakeWs()
    api.startRecordingSiteSignIn
      .mockRejectedValueOnce(refusal(409, 'Busy'))
      .mockRejectedValueOnce(refusal(409, 'Busy too'))
    const store = new RecordingSitesStore(ws)
    await ready(store)
    await store.signIn('loom')
    await store.signIn('fathom')
    expect(store.snapshot().failed).toEqual({ loom: 'Busy', fathom: 'Busy too' })
    ws.emit(RECORDING_SITES_EVENT, { site: SIGNED_IN })
    expect(store.snapshot().failed).toEqual({ fathom: 'Busy too' })
  })

  it('drops a read begun before the last change was told', async () => {
    const ws = fakeWs()
    const store = new RecordingSitesStore(ws)
    await ready(store)

    const stale = deferred<RecordingSiteState[]>()
    api.listRecordingSites.mockReturnValueOnce(stale.promise)
    const reading = store.refresh()
    ws.emit(RECORDING_SITES_EVENT, { site: SIGNED_IN })
    stale.resolve([LOOM, FATHOM])
    await reading
    expect(store.snapshot().sites).toEqual([SIGNED_IN, FATHOM])

    const failing = deferred<RecordingSiteState[]>()
    api.listRecordingSites.mockReturnValueOnce(failing.promise)
    const failed = store.refresh()
    ws.emit(RECORDING_SITES_EVENT, { site: OPEN })
    failing.reject(refusal(500, 'Late'))
    await failed
    expect(store.snapshot().readError).toBeUndefined()

    api.startRecordingSiteSignIn.mockResolvedValue({ ...FATHOM, signingIn: true })
    const late = deferred<RecordingSiteState[]>()
    api.listRecordingSites.mockReturnValueOnce(late.promise)
    const third = store.refresh()
    await store.signIn('fathom')
    late.resolve([LOOM, FATHOM])
    await third
    expect(store.snapshot().sites).toEqual([OPEN, { ...FATHOM, signingIn: true }])

    api.listRecordingSites.mockResolvedValueOnce([LOOM, FATHOM])
    await store.refresh()
    expect(store.snapshot().sites).toEqual([LOOM, FATHOM])
  })
})
