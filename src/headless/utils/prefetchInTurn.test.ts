import { describe, expect, it, vi } from 'vitest'

import { prefetchInTurn } from './prefetchInTurn'

type Deferred = { resolve: () => void; reject: (e: unknown) => void }

function controlled() {
  const pending = new Map<string, Deferred>()
  const prefetch = vi.fn(
    (id: string) =>
      new Promise<void>((resolve, reject) => {
        pending.set(id, { resolve, reject })
      }),
  )
  return { pending, prefetch }
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

describe('prefetchInTurn', () => {
  it('reads one at a time, in order, so the reads never crowd the connections', async () => {
    const { pending, prefetch } = controlled()
    prefetchInTurn(['a', 'b', 'c'], prefetch, 3)
    expect(prefetch.mock.calls.map(([id]) => id)).toEqual(['a'])
    pending.get('a')!.resolve()
    await flush()
    expect(prefetch.mock.calls.map(([id]) => id)).toEqual(['a', 'b'])
  })

  it('reads no more than its limit', async () => {
    const { pending, prefetch } = controlled()
    prefetchInTurn(['a', 'b', 'c'], prefetch, 2)
    pending.get('a')!.resolve()
    await flush()
    pending.get('b')!.resolve()
    await flush()
    expect(prefetch.mock.calls.map(([id]) => id)).toEqual(['a', 'b'])
  })

  it('starts nothing more once cancelled', async () => {
    const { pending, prefetch } = controlled()
    const cancel = prefetchInTurn(['a', 'b'], prefetch, 2)
    cancel()
    pending.get('a')!.resolve()
    await flush()
    expect(prefetch).toHaveBeenCalledTimes(1)
  })

  it('goes on to the next after a failed read', async () => {
    const { pending, prefetch } = controlled()
    prefetchInTurn(['a', 'b'], prefetch, 2)
    pending.get('a')!.reject(new Error('down'))
    await flush()
    expect(prefetch.mock.calls.map(([id]) => id)).toEqual(['a', 'b'])
  })

  it('reads nothing with nothing to read', () => {
    const { prefetch } = controlled()
    prefetchInTurn([], prefetch, 3)
    expect(prefetch).not.toHaveBeenCalled()
  })
})
