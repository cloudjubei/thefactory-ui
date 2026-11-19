import { describe, expect, it, vi } from 'vitest'
import { ReviewCommitsStore } from './reviewCommitsStore'
import type { ReviewCommits } from '../utils/reviewCommitsTypes'

const commits = (round: number): ReviewCommits => ({
  ticketKey: 'ZNR-756',
  round,
  checkedAt: '2026-11-19T10:00:00.000Z',
  pullRequests: [],
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const settle = () => new Promise((r) => setTimeout(r, 0))

describe('ReviewCommitsStore', () => {
  it('reads a ticket once on the first ask, whatever the case of its key, and keeps it', async () => {
    const read = vi.fn(async () => commits(2))
    const store = new ReviewCommitsStore(read)
    const heard = vi.fn()
    store.subscribe(heard)
    store.request('znr-756')
    expect(store.getState('ZNR-756')).toEqual({ kind: 'loading' })
    store.request('ZNR-756')
    await settle()
    expect(store.getState('ZNR-756')).toEqual({ kind: 'ready', commits: commits(2) })
    store.request('ZNR-756')
    expect(read).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith('ZNR-756')
    expect(heard).toHaveBeenCalledTimes(2)
    expect(store.getVersion()).toBe(2)
  })

  it('says a read failed, and tries again on the next ask', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error('GitHub down'))
      .mockResolvedValue(commits(1))
    const store = new ReviewCommitsStore(read)
    store.request('ZNR-756')
    await settle()
    expect(store.getState('ZNR-756')).toEqual({ kind: 'failed' })
    store.request('ZNR-756')
    await settle()
    expect(store.getState('ZNR-756').kind).toBe('ready')
  })

  it('reads again on a refresh, still showing the last answer meanwhile, one read at a time', async () => {
    const second = deferred<ReviewCommits>()
    const read = vi.fn().mockResolvedValueOnce(commits(1)).mockReturnValueOnce(second.promise)
    const store = new ReviewCommitsStore(read)
    store.request('ZNR-756')
    await settle()
    store.refresh('ZNR-756')
    store.refresh('ZNR-756')
    expect(store.getState('ZNR-756')).toEqual({ kind: 'ready', commits: commits(1) })
    second.resolve(commits(2))
    await settle()
    expect(store.getState('ZNR-756')).toEqual({ kind: 'ready', commits: commits(2) })
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('refreshes only tickets asked for before; a failed one reads again showing it loads', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(commits(3))
    const store = new ReviewCommitsStore(read)
    store.refresh('ZNR-1')
    expect(read).not.toHaveBeenCalled()
    store.request('ZNR-1')
    await settle()
    store.refreshAll()
    expect(store.getState('ZNR-1')).toEqual({ kind: 'loading' })
    await settle()
    expect(store.getState('ZNR-1').kind).toBe('ready')
  })
})
