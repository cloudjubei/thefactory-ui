import { describe, expect, it, vi } from 'vitest'

import { CommitDetailsCache } from './commitDetailsCache'

const ready = {
  status: 'ready' as const,
  details: {
    sha: 'abc',
    shortSha: 'abc',
    subject: 's',
    authorName: 'a',
    authorDate: 1,
  },
}

describe('CommitDetailsCache', () => {
  it('reads a commit once per project however often it is asked for', async () => {
    const load = vi.fn(async () => ready)
    const cache = new CommitDetailsCache(load)
    await cache.get('p', 'abc')
    await cache.get('p', 'abc')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('shares one read between asks made while it is in flight', async () => {
    const load = vi.fn(async () => ready)
    const cache = new CommitDetailsCache(load)
    const [a, b] = await Promise.all([cache.get('p', 'abc'), cache.get('p', 'abc')])
    expect(a).toBe(b)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('reads the same sha again in another project', async () => {
    const load = vi.fn(async () => ready)
    const cache = new CommitDetailsCache(load)
    await cache.get('p', 'abc')
    await cache.get('q', 'abc')
    expect(load.mock.calls).toEqual([
      ['p', 'abc'],
      ['q', 'abc'],
    ])
  })

  it('keeps a commit that is not here — it will not appear by asking again', async () => {
    const load = vi.fn(async () => ({ status: 'missing' as const }))
    const cache = new CommitDetailsCache(load)
    await cache.get('p', 'abc')
    expect(await cache.get('p', 'abc')).toEqual({ status: 'missing' })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('forgets a failed read so the next ask tries again', async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ status: 'failed', message: 'x' })
      .mockResolvedValueOnce(ready)
    const cache = new CommitDetailsCache(load)
    expect(await cache.get('p', 'abc')).toEqual({ status: 'failed', message: 'x' })
    expect(await cache.get('p', 'abc')).toBe(ready)
  })

  it('turns a read that throws into a failure and tries again next time', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(ready)
    const cache = new CommitDetailsCache(load)
    expect(await cache.get('p', 'abc')).toEqual({ status: 'failed', message: 'down' })
    expect(await cache.get('p', 'abc')).toBe(ready)
  })

  it('hands back what it already read without waiting', async () => {
    const cache = new CommitDetailsCache(async () => ready)
    expect(cache.peek('p', 'abc')).toBeUndefined()
    await cache.get('p', 'abc')
    expect(cache.peek('p', 'abc')).toBe(ready)
  })
})
