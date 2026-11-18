import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewMergeJob } from '../utils/colleagueReviewMergeTypes'

const api = vi.hoisted(() => ({
  readColleagueReviewMerge: vi.fn(),
  startColleagueReviewMerge: vi.fn(),
}))

vi.mock('../api/colleagueReviewMergeApi', () => api)

import { ColleagueReviewMergeStore } from './colleagueReviewMergeStore'

const RUNNING: ReviewMergeJob = {
  jobId: 'j1',
  groupId: 'osc',
  ticketKey: 'OSC-402',
  round: 2,
  state: 'running',
  startedAt: '2026-11-17T12:00:00.000Z',
  pullRequests: [{ url: 'https://github.com/acme/coach-be/pull/418', state: 'approving' }],
}

const MERGED: ReviewMergeJob = {
  ...RUNNING,
  state: 'merged',
  pullRequests: [{ url: 'https://github.com/acme/coach-be/pull/418', state: 'merged' }],
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

const KEY = { groupId: 'osc', ticketKey: 'OSC-402' }

const ready = async (store: ColleagueReviewMergeStore) => {
  store.retain(KEY)
  await vi.waitFor(() => expect(store.snapshot(KEY).job).not.toBeUndefined())
}

beforeEach(() => {
  api.readColleagueReviewMerge.mockReset()
  api.startColleagueReviewMerge.mockReset()
})

describe('ColleagueReviewMergeStore', () => {
  it('reads a review’s merge once for every holder, none when it never started', async () => {
    api.readColleagueReviewMerge.mockResolvedValue(null)
    const store = new ColleagueReviewMergeStore(fakeWs())
    store.retain(KEY)
    store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).job).toBeNull())
    expect(api.readColleagueReviewMerge).toHaveBeenCalledTimes(1)
    expect(api.readColleagueReviewMerge).toHaveBeenCalledWith('osc', 'OSC-402')
    expect(store.snapshot(KEY)).toBe(store.snapshot(KEY))
  })

  it('is empty for a review nobody holds', () => {
    const store = new ColleagueReviewMergeStore(fakeWs())
    expect(store.snapshot(KEY)).toEqual({
      job: undefined,
      readError: undefined,
      starting: undefined,
      refusal: undefined,
      actionError: undefined,
    })
  })

  it('reads again when the ticket’s review changes or the socket is back, and stops once let go', async () => {
    api.readColleagueReviewMerge.mockResolvedValueOnce(RUNNING).mockResolvedValue(MERGED)
    const ws = fakeWs()
    const store = new ColleagueReviewMergeStore(ws)
    const release = store.retain(KEY)
    await vi.waitFor(() => expect(store.snapshot(KEY).job).toBe(RUNNING))
    ws.emit('colleagueReviews:updated', { groupId: 'osc', ticketKey: 'OSC-9' })
    ws.emit('colleagueReviews:updated', { groupId: 'osc' })
    expect(api.readColleagueReviewMerge).toHaveBeenCalledTimes(1)
    ws.emit('colleagueReviews:updated', { groupId: 'osc', ticketKey: 'OSC-402' })
    await vi.waitFor(() => expect(store.snapshot(KEY).job).toBe(MERGED))
    ws.reconnect()
    await vi.waitFor(() => expect(api.readColleagueReviewMerge).toHaveBeenCalledTimes(3))
    release()
    expect(ws.held()).toBe(0)
  })

  it('says why a read failed, keeping what it had', async () => {
    api.readColleagueReviewMerge.mockResolvedValueOnce(RUNNING).mockRejectedValueOnce({})
    const store = new ColleagueReviewMergeStore(fakeWs())
    await ready(store)
    await store.refresh(KEY)
    expect(store.snapshot(KEY)).toMatchObject({
      job: RUNNING,
      readError: 'Could not read the merge.',
    })
  })

  it('shows a merge starting at once, once however often it is pressed, then the job', async () => {
    api.readColleagueReviewMerge.mockResolvedValue(null)
    const store = new ColleagueReviewMergeStore(fakeWs())
    await ready(store)
    const starting = deferred<ReviewMergeJob>()
    api.startColleagueReviewMerge.mockReturnValueOnce(starting.promise)
    const going = store.start(KEY, { round: 2 })
    expect(store.snapshot(KEY).starting).toEqual({ round: 2 })
    await store.start(KEY, { round: 2, slackText: 'again' })
    expect(api.startColleagueReviewMerge).toHaveBeenCalledTimes(1)
    expect(api.startColleagueReviewMerge).toHaveBeenCalledWith('osc', 'OSC-402', { round: 2 })
    starting.resolve(RUNNING)
    await going
    expect(store.snapshot(KEY)).toMatchObject({ job: RUNNING, starting: undefined })
  })

  it('starts nothing while a merge still runs', async () => {
    api.readColleagueReviewMerge.mockResolvedValue(RUNNING)
    const store = new ColleagueReviewMergeStore(fakeWs())
    await ready(store)
    await store.start(KEY, { round: 2 })
    expect(api.startColleagueReviewMerge).not.toHaveBeenCalled()
  })

  it('keeps the started job over a read begun before it', async () => {
    const reading = deferred<ReviewMergeJob | null>()
    api.readColleagueReviewMerge.mockResolvedValueOnce(null).mockReturnValueOnce(reading.promise)
    const store = new ColleagueReviewMergeStore(fakeWs())
    await ready(store)
    const stale = store.refresh(KEY)
    api.startColleagueReviewMerge.mockResolvedValueOnce(RUNNING)
    await store.start(KEY, { round: 2 })
    reading.resolve(null)
    await stale
    expect(store.snapshot(KEY).job).toBe(RUNNING)
  })

  it('holds a round that asked for changes with the backend’s words, until it is merged anyway', async () => {
    api.readColleagueReviewMerge.mockResolvedValue(null)
    const store = new ColleagueReviewMergeStore(fakeWs())
    await ready(store)
    api.startColleagueReviewMerge.mockRejectedValueOnce(
      refusal(409, 'Round 2 asked for changes. Merge anyway?'),
    )
    await store.start(KEY, { round: 2 })
    expect(store.snapshot(KEY)).toMatchObject({
      job: null,
      starting: undefined,
      refusal: 'Round 2 asked for changes. Merge anyway?',
      actionError: undefined,
    })
    api.startColleagueReviewMerge.mockResolvedValueOnce(RUNNING)
    const anyway = store.start(KEY, { round: 2, override: true })
    expect(store.snapshot(KEY).refusal).toBeUndefined()
    await anyway
    expect(store.snapshot(KEY).job).toBe(RUNNING)
  })

  it('rolls a start back with why it did not go, in the backend’s words or its own', async () => {
    api.readColleagueReviewMerge.mockResolvedValue(null)
    const store = new ColleagueReviewMergeStore(fakeWs())
    await ready(store)
    api.startColleagueReviewMerge.mockRejectedValueOnce(refusal(400, 'The round lists no PRs.'))
    await store.start(KEY, { round: 2 })
    expect(store.snapshot(KEY)).toMatchObject({
      starting: undefined,
      refusal: undefined,
      actionError: 'The round lists no PRs.',
    })
    api.startColleagueReviewMerge.mockRejectedValueOnce(refusal(409, 'Still asks for changes.'))
    await store.start(KEY, { round: 2, override: true })
    expect(store.snapshot(KEY)).toMatchObject({
      refusal: undefined,
      actionError: 'Still asks for changes.',
    })
    api.startColleagueReviewMerge.mockRejectedValueOnce({})
    await store.start(KEY, { round: 2 })
    expect(store.snapshot(KEY).actionError).toBe('The merge did not start.')
  })
})
