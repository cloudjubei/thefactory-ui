import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkQueue, WorkQueueEntry, WorkQueueScope } from 'thefactory-tools/types'

const api = vi.hoisted(() => ({
  read: vi.fn(),
  add: vi.fn(),
  move: vi.fn(),
  remove: vi.fn(),
  slots: vi.fn(),
}))
vi.mock('../api/workQueueApi', () => ({
  readWorkQueue: api.read,
  addToWorkQueue: api.add,
  moveInWorkQueue: api.move,
  removeFromWorkQueue: api.remove,
  readRunSlots: api.slots,
}))

import { useWorkQueue } from './useWorkQueue'

const SCOPE: WorkQueueScope = { kind: 'project', projectId: 'tools' }
const story = (storyId: string): WorkQueueEntry => ({ kind: 'story', projectId: 'tools', storyId })
const A = story('a')
const B = story('b')
const C = story('c')
const queueOf = (...entries: WorkQueueEntry[]): WorkQueue => ({ scope: SCOPE, entries })
const ids = (view: { rows: { entry: WorkQueueEntry }[] } | undefined) =>
  view?.rows.map((r) => (r.entry.kind === 'story' ? r.entry.storyId : r.entry.groupStoryId))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

async function mounted(onError = vi.fn()) {
  api.read.mockResolvedValue(queueOf(A, B, C))
  api.slots.mockResolvedValue({ cap: 10, live: 7, waiting: [] })
  const hook = renderHook(() => useWorkQueue(SCOPE, { onError }))
  await waitFor(() => expect(hook.result.current.view?.rows).toHaveLength(3))
  return { ...hook, onError }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useWorkQueue', () => {
  it('reads the scope’s queue and the run slots', async () => {
    const { result } = await mounted()
    expect(api.read).toHaveBeenCalledWith(SCOPE)
    expect(ids(result.current.view)).toEqual(['a', 'b', 'c'])
    expect(result.current.view?.capLine).toBe('7 of 10 running')
    expect(result.current.loading).toBe(false)
  })

  it('moves an entry down at once, sends its new place, and keeps the server’s answer', async () => {
    const answer = deferred<WorkQueue>()
    api.move.mockReturnValue(answer.promise)
    const { result } = await mounted()
    act(() => result.current.moveDown(A))
    expect(ids(result.current.view)).toEqual(['b', 'a', 'c'])
    expect(api.move).toHaveBeenCalledWith(SCOPE, A, 1)
    await act(async () => answer.resolve(queueOf(B, A, C)))
    expect(ids(result.current.view)).toEqual(['b', 'a', 'c'])
  })

  it('moves an entry up to the place above it', async () => {
    api.move.mockResolvedValue(queueOf(A, C, B))
    const { result } = await mounted()
    await act(async () => result.current.moveUp(C))
    expect(api.move).toHaveBeenCalledWith(SCOPE, C, 1)
    expect(ids(result.current.view)).toEqual(['a', 'c', 'b'])
  })

  it('does nothing for a move past either end', async () => {
    const { result } = await mounted()
    act(() => {
      result.current.moveUp(A)
      result.current.moveDown(C)
    })
    expect(api.move).not.toHaveBeenCalled()
    expect(ids(result.current.view)).toEqual(['a', 'b', 'c'])
  })

  it('takes a refused move back and says why', async () => {
    const answer = deferred<WorkQueue>()
    api.move.mockReturnValue(answer.promise)
    const { result, onError } = await mounted()
    act(() => result.current.moveDown(B))
    expect(ids(result.current.view)).toEqual(['a', 'c', 'b'])
    await act(async () => answer.reject(new Error('Conflict')))
    expect(ids(result.current.view)).toEqual(['a', 'b', 'c'])
    expect(onError).toHaveBeenCalledWith('Conflict')
  })

  it('adds an entry at once, last unless a place is named, and never queues the same work twice', async () => {
    const D = story('d')
    api.add.mockResolvedValue(queueOf(A, B, C, D))
    const { result } = await mounted()
    act(() => result.current.add(D))
    expect(ids(result.current.view)).toEqual(['a', 'b', 'c', 'd'])
    expect(api.add).toHaveBeenCalledWith(SCOPE, D, undefined)
    await act(async () => {})
    act(() => result.current.add(D))
    expect(api.add).toHaveBeenCalledTimes(1)
  })

  it('removes an entry at once and puts it back when the server refuses', async () => {
    const answer = deferred<WorkQueue>()
    api.remove.mockReturnValue(answer.promise)
    const { result, onError } = await mounted()
    act(() => result.current.remove(B))
    expect(ids(result.current.view)).toEqual(['a', 'c'])
    expect(api.remove).toHaveBeenCalledWith(SCOPE, B)
    await act(async () => answer.reject(new Error('Gone')))
    expect(ids(result.current.view)).toEqual(['a', 'b', 'c'])
    expect(onError).toHaveBeenCalledWith('Gone')
  })

  it('reads nothing without a scope', () => {
    const { result } = renderHook(() => useWorkQueue(undefined))
    expect(api.read).not.toHaveBeenCalled()
    expect(result.current.view).toBeUndefined()
  })
})
