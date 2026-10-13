import { describe, expect, it, vi } from 'vitest'

import { LiveResourceStore } from './liveResourceStore'
import type { LiveResourceHandle, LiveResourceTimers } from './liveResourceStoreTypes'

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void }

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

class ManualTimers implements LiveResourceTimers {
  private next = 1
  readonly pending = new Map<number, () => void>()

  set(fn: () => void): unknown {
    const id = this.next++
    this.pending.set(id, fn)
    return id
  }

  clear(handle: unknown): void {
    this.pending.delete(handle as number)
  }

  fireAll(): void {
    const due = [...this.pending.values()]
    this.pending.clear()
    for (const fn of due) fn()
  }
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

function harness<T>(opts: {
  loads?: Array<Deferred<T>>
  recall?: (key: string) => T | undefined
  withConnect?: boolean
}) {
  const loads = opts.loads ?? []
  const load = vi.fn((_key: string) => {
    const next = loads.shift()
    if (!next) throw new Error('unexpected load')
    return next.promise
  })
  const remembered: Array<[string, T]> = []
  const handles = new Map<string, LiveResourceHandle<T>>()
  const disconnects: string[] = []
  const timers = new ManualTimers()
  const store = new LiveResourceStore<T>({
    load,
    lingerMs: 1000,
    timers,
    remember: (key, data) => remembered.push([key, data]),
    ...(opts.recall ? { recall: opts.recall } : {}),
    ...(opts.withConnect === false
      ? {}
      : {
          connect: (key: string, handle: LiveResourceHandle<T>) => {
            handles.set(key, handle)
            return () => disconnects.push(key)
          },
        }),
  })
  return { store, load, remembered, handles, disconnects, timers }
}

describe('LiveResourceStore', () => {
  it('reads a key once however many views hold it at the same time', async () => {
    const first = deferred<string[]>()
    const h = harness({ loads: [first] })
    const releaseA = h.store.retain('p1')
    const releaseB = h.store.retain('p1')
    const releaseC = h.store.retain('p1')
    expect(h.load).toHaveBeenCalledTimes(1)
    first.resolve(['run-1'])
    await flush()
    expect(h.store.snapshot('p1')).toEqual({ data: ['run-1'], settled: true, error: null })
    releaseA()
    releaseB()
    releaseC()
  })

  it('reads each key on its own', () => {
    const h = harness({ loads: [deferred<number>(), deferred<number>()] })
    h.store.retain('p1')
    h.store.retain('p2')
    expect(h.load.mock.calls.map(([key]) => key)).toEqual(['p1', 'p2'])
  })

  it('paints what was remembered at once, settled, and re-reads behind it', async () => {
    const fresh = deferred<string[]>()
    const h = harness({ loads: [fresh], recall: (key) => (key === 'p1' ? ['old'] : undefined) })
    expect(h.store.snapshot('p1')).toEqual({ data: ['old'], settled: true, error: null })
    expect(h.store.snapshot('p2')).toEqual({ data: undefined, settled: false, error: null })
    h.store.retain('p1')
    expect(h.load).toHaveBeenCalledTimes(1)
    fresh.resolve(['new'])
    await flush()
    expect(h.store.snapshot('p1').data).toEqual(['new'])
    expect(h.remembered).toEqual([['p1', ['new']]])
  })

  it('does not re-read a key that a view let go of and another took back within the linger', async () => {
    const first = deferred<number>()
    const h = harness({ loads: [first] })
    const release = h.store.retain('p1')
    first.resolve(1)
    await flush()
    release()
    expect(h.timers.pending.size).toBe(1)
    h.store.retain('p1')
    expect(h.timers.pending.size).toBe(0)
    expect(h.load).toHaveBeenCalledTimes(1)
    expect(h.disconnects).toEqual([])
  })

  it('goes quiet after the linger, and re-reads when held again', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const h = harness({ loads: [first, second] })
    const release = h.store.retain('p1')
    first.resolve(1)
    await flush()
    release()
    h.timers.fireAll()
    expect(h.disconnects).toEqual(['p1'])
    h.store.retain('p1')
    expect(h.load).toHaveBeenCalledTimes(2)
  })

  it('keeps a key live while any view still holds it', async () => {
    const first = deferred<number>()
    const h = harness({ loads: [first] })
    const releaseA = h.store.retain('p1')
    h.store.retain('p1')
    first.resolve(1)
    await flush()
    releaseA()
    expect(h.timers.pending.size).toBe(0)
    expect(h.disconnects).toEqual([])
  })

  it('a release called twice counts once', async () => {
    const first = deferred<number>()
    const h = harness({ loads: [first] })
    const releaseA = h.store.retain('p1')
    h.store.retain('p1')
    first.resolve(1)
    await flush()
    releaseA()
    releaseA()
    expect(h.timers.pending.size).toBe(0)
  })

  it('connects live updates once per held key and applies them to every listener', async () => {
    const first = deferred<string[]>()
    const h = harness({ loads: [first] })
    h.store.retain('p1')
    h.store.retain('p1')
    expect(h.handles.size).toBe(1)
    first.resolve(['a'])
    await flush()
    const seen: Array<string[] | undefined> = []
    h.store.listen('p1', () => seen.push(h.store.snapshot('p1').data))
    h.handles.get('p1')!.patch((prev) => [...(prev ?? []), 'b'])
    expect(seen).toEqual([['a', 'b']])
    expect(h.remembered.at(-1)).toEqual(['p1', ['a', 'b']])
  })

  it('keeps the snapshot identity when a live update changes nothing', async () => {
    const first = deferred<string[]>()
    const h = harness({ loads: [first] })
    h.store.retain('p1')
    first.resolve(['a'])
    await flush()
    const before = h.store.snapshot('p1')
    const listener = vi.fn()
    h.store.listen('p1', listener)
    h.handles.get('p1')!.patch((prev) => prev as string[])
    expect(h.store.snapshot('p1')).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it('does not remember a live update that arrives before the first read', () => {
    const h = harness({ loads: [deferred<string[]>()] })
    h.store.retain('p1')
    h.handles.get('p1')!.patch(() => ['early'])
    expect(h.store.snapshot('p1')).toEqual({ data: ['early'], settled: false, error: null })
    expect(h.remembered).toEqual([])
  })

  it('folds a burst of refreshes into the one in flight plus one after it', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const h = harness({ loads: [first, second] })
    h.store.retain('p1')
    void h.store.refresh('p1')
    void h.store.refresh('p1')
    void h.store.refresh('p1')
    expect(h.load).toHaveBeenCalledTimes(1)
    first.resolve(1)
    await flush()
    expect(h.load).toHaveBeenCalledTimes(2)
    second.resolve(2)
    await flush()
    expect(h.store.snapshot('p1').data).toBe(2)
  })

  it('settles with the error and keeps what it had when a read fails', async () => {
    const failing = deferred<string[]>()
    const h = harness({ loads: [failing], recall: () => ['kept'] })
    h.store.retain('p1')
    failing.reject(new Error('boom'))
    await flush()
    const snap = h.store.snapshot('p1')
    expect(snap.data).toEqual(['kept'])
    expect(snap.settled).toBe(true)
    expect(snap.error?.message).toBe('boom')
  })

  it('settles a first read that fails, so the view stops waiting', async () => {
    const failing = deferred<string[]>()
    const h = harness({ loads: [failing] })
    h.store.retain('p1')
    failing.reject('not an Error')
    await flush()
    expect(h.store.snapshot('p1')).toEqual({
      data: undefined,
      settled: true,
      error: new Error('not an Error'),
    })
  })

  it('clears the error on the next good read', async () => {
    const failing = deferred<number>()
    const good = deferred<number>()
    const h = harness({ loads: [failing, good] })
    h.store.retain('p1')
    failing.reject(new Error('boom'))
    await flush()
    void h.store.refresh('p1')
    good.resolve(7)
    await flush()
    expect(h.store.snapshot('p1')).toEqual({ data: 7, settled: true, error: null })
  })

  it('stops notifying a listener that left', async () => {
    const first = deferred<number>()
    const h = harness({ loads: [first] })
    const listener = vi.fn()
    const unlisten = h.store.listen('p1', listener)
    h.store.retain('p1')
    unlisten()
    first.resolve(1)
    await flush()
    expect(listener).not.toHaveBeenCalled()
  })

  it('works without live updates: a held key is read, and read again after it went quiet', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const h = harness({ loads: [first, second], withConnect: false })
    const release = h.store.retain('p1')
    first.resolve(1)
    await flush()
    release()
    h.timers.fireAll()
    h.store.retain('p1')
    expect(h.load).toHaveBeenCalledTimes(2)
  })

  it('lets live updates re-read through the handle', async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const h = harness({ loads: [first, second] })
    h.store.retain('p1')
    first.resolve(1)
    await flush()
    void h.handles.get('p1')!.refresh()
    second.resolve(2)
    await flush()
    expect(h.store.snapshot('p1').data).toBe(2)
  })
})
