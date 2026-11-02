import { describe, expect, it, vi } from 'vitest'
import type { ProcessNeedsYouItem } from 'thefactory-tools/types'

import { RunNeedsYouItemsCache } from './runNeedsYouItemsCache'

const ITEMS: ProcessNeedsYouItem[] = [{ id: 'ny-1a2b3c4d', text: 'Decide the cap.' }]

describe('RunNeedsYouItemsCache', () => {
  it('reads a run’s items once however many chips ask, and shares a read in flight', async () => {
    const load = vi.fn(async () => ITEMS)
    const cache = new RunNeedsYouItemsCache(load)
    const [a, b] = await Promise.all([cache.get('r1'), cache.get('r1')])
    await cache.get('r1')
    expect(a).toBe(b)
    expect(load).toHaveBeenCalledTimes(1)
    expect(cache.peek('r1')).toEqual({ status: 'ready', items: ITEMS })
  })

  it('reads a run again once it changed, while a read in flight is still shared', async () => {
    const load = vi.fn(async () => ITEMS)
    const cache = new RunNeedsYouItemsCache(load)
    await cache.get('r1')
    cache.forget('r1')
    expect(cache.peek('r1')).toBeUndefined()
    const pending = cache.get('r1')
    cache.forget('r1')
    await Promise.all([pending, cache.get('r1')])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('says a read failed, and tries again on the next ask', async () => {
    const load = vi
      .fn<(runId: string) => Promise<ProcessNeedsYouItem[]>>()
      .mockRejectedValueOnce(new Error('No process run r1.'))
      .mockResolvedValueOnce(ITEMS)
    const cache = new RunNeedsYouItemsCache(load)
    expect(await cache.get('r1')).toEqual({ status: 'failed', message: 'No process run r1.' })
    expect(cache.peek('r1')).toBeUndefined()
    expect(await cache.get('r1')).toEqual({ status: 'ready', items: ITEMS })
  })
})
