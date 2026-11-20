import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewMergeChecks } from '../utils/reviewMergeChecksTypes'

const api = vi.hoisted(() => ({
  readColleagueReviewChecks: vi.fn(),
  setColleagueReviewCheckRequired: vi.fn(),
}))

vi.mock('../api/colleagueReviewSourceApi', () => api)

import { ReviewMergeChecksStore } from './reviewMergeChecksStore'

const CHECKS: ReviewMergeChecks = {
  repositories: [
    {
      repository: 'acme/web',
      checks: [
        { name: 'build', required: true },
        { name: 'e2e', required: true },
      ],
    },
  ],
}

const UNTICK = { repository: 'acme/web', check: 'e2e', required: false }

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
  return {
    onReconnect: (handler: () => void) => {
      reconnects.add(handler)
      return () => {
        reconnects.delete(handler)
      }
    },
    reconnect: () => reconnects.forEach((h) => h()),
    held: () => reconnects.size,
  }
}

const e2e = (store: ReviewMergeChecksStore) =>
  store.snapshot('osc').checks?.repositories[0]?.checks.find((c) => c.name === 'e2e')

const ready = async (store: ReviewMergeChecksStore) => {
  store.retain('osc')
  await vi.waitFor(() => expect(store.snapshot('osc').checks).toBeDefined())
}

beforeEach(() => {
  api.readColleagueReviewChecks.mockReset()
  api.setColleagueReviewCheckRequired.mockReset()
})

describe('ReviewMergeChecksStore', () => {
  it('reads a group’s checks once for every holder, and keeps the snapshot until it changes', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    const store = new ReviewMergeChecksStore(fakeWs())
    const listener = vi.fn()
    store.listen('osc', listener)
    store.retain('osc')
    store.retain('osc')
    await vi.waitFor(() => expect(store.snapshot('osc').checks).toBe(CHECKS))
    expect(api.readColleagueReviewChecks).toHaveBeenCalledTimes(1)
    expect(api.readColleagueReviewChecks).toHaveBeenCalledWith('osc')
    expect(listener).toHaveBeenCalled()
    expect(store.snapshot('osc')).toBe(store.snapshot('osc'))
    expect(store.snapshot('osc')).toEqual({
      checks: CHECKS,
      readError: undefined,
      changes: [],
      actionError: undefined,
    })
  })

  it('is empty for a group nobody holds', () => {
    const store = new ReviewMergeChecksStore(fakeWs())
    expect(store.snapshot('osc')).toEqual({
      checks: undefined,
      readError: undefined,
      changes: [],
      actionError: undefined,
    })
    expect(api.readColleagueReviewChecks).not.toHaveBeenCalled()
  })

  it('reads again when the socket is back, and stops listening once the last holder lets go', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    const ws = fakeWs()
    const store = new ReviewMergeChecksStore(ws)
    const first = store.retain('osc')
    const second = store.retain('osc')
    await vi.waitFor(() => expect(api.readColleagueReviewChecks).toHaveBeenCalledTimes(1))
    ws.reconnect()
    await vi.waitFor(() => expect(api.readColleagueReviewChecks).toHaveBeenCalledTimes(2))
    first()
    first()
    expect(ws.held()).toBe(1)
    second()
    expect(ws.held()).toBe(0)
  })

  it('says why a read failed', async () => {
    api.readColleagueReviewChecks.mockRejectedValue(refusal(502, 'GitHub is down'))
    const store = new ReviewMergeChecksStore(fakeWs())
    store.retain('osc')
    await vi.waitFor(() => expect(store.snapshot('osc').readError).toBe('GitHub is down'))
  })

  it('shows a change at once, keeps it once the backend has it, and sends nothing for a press that changes nothing', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    const answer = deferred<typeof UNTICK>()
    api.setColleagueReviewCheckRequired.mockReturnValue(answer.promise)
    const store = new ReviewMergeChecksStore(fakeWs())
    await ready(store)

    const going = store.setRequired('osc', UNTICK)
    expect(e2e(store)?.required).toBe(false)
    expect(store.snapshot('osc').changes).toEqual([UNTICK])
    await store.setRequired('osc', UNTICK)
    expect(api.setColleagueReviewCheckRequired).toHaveBeenCalledTimes(1)
    expect(api.setColleagueReviewCheckRequired).toHaveBeenCalledWith('osc', UNTICK)

    answer.resolve(UNTICK)
    await going
    expect(e2e(store)?.required).toBe(false)
    expect(store.snapshot('osc').changes).toEqual([])
    await store.setRequired('osc', UNTICK)
    expect(api.setColleagueReviewCheckRequired).toHaveBeenCalledTimes(1)
  })

  it('rolls a refused change back with why, and clears why on the next change', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    api.setColleagueReviewCheckRequired.mockRejectedValueOnce(
      refusal(400, 'repository must be owner/repo'),
    )
    const store = new ReviewMergeChecksStore(fakeWs())
    await ready(store)

    await store.setRequired('osc', UNTICK)
    expect(e2e(store)?.required).toBe(true)
    expect(store.snapshot('osc').actionError).toBe('repository must be owner/repo')

    api.setColleagueReviewCheckRequired.mockResolvedValueOnce(UNTICK)
    const again = store.setRequired('osc', UNTICK)
    expect(store.snapshot('osc').actionError).toBeUndefined()
    await again
    expect(e2e(store)?.required).toBe(false)
  })

  it('keeps the latest of quick changes to one check, whichever answer comes first', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    const off = deferred<typeof UNTICK>()
    const on = deferred<typeof UNTICK>()
    api.setColleagueReviewCheckRequired
      .mockReturnValueOnce(off.promise)
      .mockReturnValueOnce(on.promise)
    const store = new ReviewMergeChecksStore(fakeWs())
    await ready(store)

    const first = store.setRequired('osc', UNTICK)
    const second = store.setRequired('osc', { ...UNTICK, required: true })
    expect(e2e(store)?.required).toBe(true)
    on.resolve({ ...UNTICK, required: true })
    await second
    expect(e2e(store)?.required).toBe(true)
    off.resolve(UNTICK)
    await first
    expect(e2e(store)?.required).toBe(true)
  })

  it('keeps the latest of quick changes when the earlier answer comes first', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    const off = deferred<typeof UNTICK>()
    const on = deferred<typeof UNTICK>()
    api.setColleagueReviewCheckRequired
      .mockReturnValueOnce(off.promise)
      .mockReturnValueOnce(on.promise)
    const store = new ReviewMergeChecksStore(fakeWs())
    await ready(store)

    const first = store.setRequired('osc', UNTICK)
    const second = store.setRequired('osc', { ...UNTICK, required: true })
    off.resolve(UNTICK)
    await first
    expect(e2e(store)?.required).toBe(true)
    expect(store.snapshot('osc').changes).toEqual([{ ...UNTICK, required: true }])
    on.resolve({ ...UNTICK, required: true })
    await second
    expect(e2e(store)?.required).toBe(true)
    expect(store.snapshot('osc').changes).toEqual([])
  })

  it('drops a failed read begun before a change was answered', async () => {
    const stale = deferred<ReviewMergeChecks>()
    api.readColleagueReviewChecks.mockResolvedValueOnce(CHECKS).mockReturnValueOnce(stale.promise)
    api.setColleagueReviewCheckRequired.mockResolvedValue(UNTICK)
    const ws = fakeWs()
    const store = new ReviewMergeChecksStore(ws)
    await ready(store)

    ws.reconnect()
    await store.setRequired('osc', UNTICK)
    stale.reject(refusal(502, 'GitHub is down'))
    await vi.waitFor(() => expect(api.readColleagueReviewChecks).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(store.snapshot('osc').readError).toBeUndefined()
  })

  it('stops telling a listener once it lets go', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    const store = new ReviewMergeChecksStore(fakeWs())
    const listener = vi.fn()
    const stop = store.listen('osc', listener)
    stop()
    await ready(store)
    expect(listener).not.toHaveBeenCalled()
  })

  it('says nothing of a superseded change that failed once a later one was kept', async () => {
    api.readColleagueReviewChecks.mockResolvedValue(CHECKS)
    const off = deferred<typeof UNTICK>()
    api.setColleagueReviewCheckRequired
      .mockReturnValueOnce(off.promise)
      .mockResolvedValueOnce({ ...UNTICK, required: true })
    const store = new ReviewMergeChecksStore(fakeWs())
    await ready(store)

    const first = store.setRequired('osc', UNTICK)
    await store.setRequired('osc', { ...UNTICK, required: true })
    off.reject(refusal(502, 'late'))
    await first
    expect(e2e(store)?.required).toBe(true)
    expect(store.snapshot('osc').actionError).toBeUndefined()
  })

  it('drops a read begun before a change was answered, so the change stays shown', async () => {
    const stale = deferred<ReviewMergeChecks>()
    api.readColleagueReviewChecks.mockResolvedValueOnce(CHECKS).mockReturnValueOnce(stale.promise)
    api.setColleagueReviewCheckRequired.mockResolvedValue(UNTICK)
    const ws = fakeWs()
    const store = new ReviewMergeChecksStore(ws)
    await ready(store)

    ws.reconnect()
    await store.setRequired('osc', UNTICK)
    stale.resolve(CHECKS)
    await vi.waitFor(() => expect(api.readColleagueReviewChecks).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(e2e(store)?.required).toBe(false)
  })
})
