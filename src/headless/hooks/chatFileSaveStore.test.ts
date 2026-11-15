import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ saveChatFileToProject: vi.fn() }))

vi.mock('../api/chatFileSaveApi', () => api)

import { ChatFileSaveStore } from './chatFileSaveStore'
import type { ChatFileSaveOutcome } from '../utils/chatFileSaveTypes'

const deferred = () => {
  let resolve!: (outcome: ChatFileSaveOutcome) => void
  const promise = new Promise<ChatFileSaveOutcome>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const SOURCE = '.factory/attachments/c1/0123456789ab-map.png'

describe('ChatFileSaveStore', () => {
  it('starts idle for any file', () => {
    expect(new ChatFileSaveStore().stateOf('p1', SOURCE)).toEqual({ status: 'idle' })
  })

  it('reads as under way at once, then saved where the backend put it', async () => {
    const store = new ChatFileSaveStore()
    const listener = vi.fn()
    store.subscribe(listener)
    const answer = deferred()
    const call = vi.fn(() => answer.promise)
    const saving = store.save({ projectId: 'p1', source: SOURCE, destination: 'map.png', call })
    expect(store.stateOf('p1', SOURCE)).toEqual({ status: 'saving', destination: 'map.png' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledWith('p1', { source: SOURCE, destination: 'map.png' })
    answer.resolve({ ok: true, path: 'art/map.png' })
    expect(await saving).toEqual({ ok: true, path: 'art/map.png' })
    expect(store.stateOf('p1', SOURCE)).toEqual({ status: 'saved', destination: 'art/map.png' })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does nothing for a press again while one is under way, or for the same save once done', async () => {
    const store = new ChatFileSaveStore()
    const answer = deferred()
    const call = vi.fn(() => answer.promise)
    const first = store.save({ projectId: 'p1', source: SOURCE, destination: 'map.png', call })
    expect(
      await store.save({ projectId: 'p1', source: SOURCE, destination: 'map.png', call }),
    ).toBeUndefined()
    answer.resolve({ ok: true, path: 'map.png' })
    await first
    expect(
      await store.save({ projectId: 'p1', source: SOURCE, destination: 'map.png', call }),
    ).toBeUndefined()
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('takes the save back on a taken destination, and replaces it when asked', async () => {
    const store = new ChatFileSaveStore()
    const call = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'map.png is already there', exists: true })
      .mockResolvedValueOnce({ ok: true, path: 'map.png' })
    await store.save({ projectId: 'p1', source: SOURCE, destination: 'map.png', call })
    expect(store.stateOf('p1', SOURCE)).toEqual({
      status: 'failed',
      destination: 'map.png',
      error: 'map.png is already there',
      exists: true,
    })
    await store.save({
      projectId: 'p1',
      source: SOURCE,
      destination: 'map.png',
      overwrite: true,
      call,
    })
    expect(call).toHaveBeenLastCalledWith('p1', {
      source: SOURCE,
      destination: 'map.png',
      overwrite: true,
    })
    expect(store.stateOf('p1', SOURCE)).toEqual({ status: 'saved', destination: 'map.png' })
  })

  it('takes the save back with the reason when the call throws', async () => {
    const store = new ChatFileSaveStore()
    await store.save({
      projectId: 'p1',
      source: SOURCE,
      destination: 'map.png',
      call: () => Promise.reject(new Error('offline')),
    })
    expect(store.stateOf('p1', SOURCE)).toMatchObject({ status: 'failed', error: 'offline' })
    await store.save({
      projectId: 'p1',
      source: SOURCE,
      destination: 'map.png',
      call: () => Promise.reject('down'),
    })
    expect(store.stateOf('p1', SOURCE)).toMatchObject({ status: 'failed', error: 'down' })
  })

  it('saves through the backend call when none is given', async () => {
    api.saveChatFileToProject.mockResolvedValue({ ok: true, path: 'map.png' })
    const store = new ChatFileSaveStore()
    await store.save({ projectId: 'p1', source: SOURCE, destination: 'map.png' })
    expect(api.saveChatFileToProject).toHaveBeenCalledWith('p1', {
      source: SOURCE,
      destination: 'map.png',
    })
  })

  it('puts a failure away on dismiss, and only a failure', async () => {
    const store = new ChatFileSaveStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.dismiss('p1', SOURCE)
    expect(listener).not.toHaveBeenCalled()
    await store.save({
      projectId: 'p1',
      source: SOURCE,
      destination: 'map.png',
      call: async () => ({ ok: false, error: 'x', exists: false }),
    })
    store.dismiss('p1', SOURCE)
    expect(store.stateOf('p1', SOURCE)).toEqual({ status: 'idle' })
    await store.save({
      projectId: 'p1',
      source: SOURCE,
      destination: 'map.png',
      call: async () => ({ ok: true, path: 'map.png' }),
    })
    store.dismiss('p1', SOURCE)
    expect(store.stateOf('p1', SOURCE)).toEqual({ status: 'saved', destination: 'map.png' })
  })

  it('stops telling a listener once it unsubscribes, and keeps files apart', async () => {
    const store = new ChatFileSaveStore()
    const listener = vi.fn()
    store.subscribe(listener)()
    await store.save({
      projectId: 'p1',
      source: SOURCE,
      destination: 'map.png',
      call: async () => ({ ok: true, path: 'map.png' }),
    })
    expect(listener).not.toHaveBeenCalled()
    expect(store.stateOf('p2', SOURCE)).toEqual({ status: 'idle' })
    expect(store.stateOf('p1', 'other.png')).toEqual({ status: 'idle' })
  })
})
