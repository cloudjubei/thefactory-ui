import { describe, expect, it, vi } from 'vitest'

import type { GetStoryResponse } from '../api/generated'
import { ForeignStoriesLoader } from './ForeignStoriesLoader'

const story = (id: string) => ({ id, features: [] }) as unknown as GetStoryResponse

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function settle() {
  await new Promise((r) => setTimeout(r, 0))
}

function subject(ttlMs = 1000) {
  let now = 0
  const calls: Array<ReturnType<typeof deferred<GetStoryResponse[]>>> = []
  const fetch = vi.fn((_projectId: string) => {
    const d = deferred<GetStoryResponse[]>()
    calls.push(d)
    return d.promise
  })
  const loader = new ForeignStoriesLoader(fetch, ttlMs, () => now)
  const listener = vi.fn()
  loader.subscribe(listener)
  return {
    loader,
    fetch,
    calls,
    listener,
    advance: (ms: number) => {
      now += ms
    },
  }
}

describe('ForeignStoriesLoader', () => {
  it('knows nothing of a project it was never asked for', () => {
    const { loader, fetch } = subject()
    expect(loader.state('p2')).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('is loading at once when asked, without telling anyone yet, and fetches once', () => {
    const { loader, fetch, listener } = subject()
    loader.request('p2')
    loader.request('p2')
    expect(loader.state('p2')).toEqual({ status: 'loading' })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('p2')
    expect(listener).not.toHaveBeenCalled()
  })

  it('holds the stories it fetched and tells its listeners', async () => {
    const { loader, calls, listener, advance } = subject()
    advance(5)
    loader.request('p2')
    calls[0]!.resolve([story('a'), story('b')])
    await settle()
    const state = loader.state('p2')
    expect(state?.status).toBe('loaded')
    if (state?.status !== 'loaded') return
    expect(state.at).toBe(5)
    expect(state.lookup.positions.get('b')).toBe(2)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('fails a project it cannot read, and tells its listeners', async () => {
    const { loader, calls, listener } = subject()
    loader.request('nowhere')
    calls[0]!.reject(new Error('404'))
    await settle()
    expect(loader.state('nowhere')).toEqual({ status: 'failed', at: 0 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reuses what it fetched until it is stale, then fetches again while still showing it', async () => {
    const { loader, fetch, calls, advance } = subject(1000)
    loader.request('p2')
    calls[0]!.resolve([story('a')])
    await settle()
    advance(999)
    loader.request('p2')
    expect(fetch).toHaveBeenCalledTimes(1)
    advance(1)
    loader.request('p2')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(loader.state('p2')?.status).toBe('loaded')
    calls[1]!.resolve([story('a'), story('c')])
    await settle()
    const state = loader.state('p2')
    expect(state?.status === 'loaded' && state.lookup.byId.has('c')).toBe(true)
  })

  it('keeps the stories it had when a later fetch fails', async () => {
    const { loader, calls, advance } = subject(10)
    loader.request('p2')
    calls[0]!.resolve([story('a')])
    await settle()
    advance(10)
    loader.request('p2')
    calls[1]!.reject(new Error('offline'))
    await settle()
    expect(loader.state('p2')?.status).toBe('loaded')
  })

  it('tries a failed project again once it is stale', async () => {
    const { loader, fetch, calls, advance } = subject(10)
    loader.request('p2')
    calls[0]!.reject(new Error('down'))
    await settle()
    loader.request('p2')
    expect(fetch).toHaveBeenCalledTimes(1)
    advance(10)
    loader.request('p2')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('fetches a project it holds again when told it changed, and ignores one it never fetched', async () => {
    const { loader, fetch, calls } = subject()
    loader.invalidate('p2')
    expect(fetch).not.toHaveBeenCalled()
    loader.request('p2')
    calls[0]!.resolve([story('a')])
    await settle()
    loader.invalidate('p2')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(loader.state('p2')?.status).toBe('loaded')
  })

  it('fetches again once a fetch lands that a change may have overtaken', async () => {
    const { loader, fetch, calls } = subject()
    loader.request('p2')
    loader.invalidate('p2')
    expect(fetch).toHaveBeenCalledTimes(1)
    calls[0]!.resolve([story('a')])
    await settle()
    expect(fetch).toHaveBeenCalledTimes(2)
    calls[1]!.resolve([story('a'), story('b')])
    await settle()
    const state = loader.state('p2')
    expect(state?.status === 'loaded' && state.lookup.byId.has('b')).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('stops telling a listener once it unsubscribes', async () => {
    const { loader, calls } = subject()
    const late = vi.fn()
    const off = loader.subscribe(late)
    off()
    loader.request('p2')
    calls[0]!.resolve([])
    await settle()
    expect(late).not.toHaveBeenCalled()
  })
})
