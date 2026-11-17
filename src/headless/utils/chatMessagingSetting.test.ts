import { describe, expect, it, vi } from 'vitest'
import { ChatMessagingSettingStore, chatMessagingAllowed } from './chatMessagingSetting'

describe('chat messaging permission', () => {
  it('grants only explicit true in the backend setting shape', () => {
    for (const value of [null, undefined, true, {}, { allowWithoutAsking: 'true' }]) {
      expect(chatMessagingAllowed(value)).toBe(false)
    }
    expect(chatMessagingAllowed({ allowWithoutAsking: true })).toBe(true)
  })

  it('loads the stored choice and persists both directions for all subscribers', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const store = new ChatMessagingSettingStore(async () => ({ allowWithoutAsking: true }), write)
    const one = vi.fn()
    const two = vi.fn()
    store.subscribe(one)
    store.subscribe(two)
    await store.load()
    expect(store.snapshot().allowed).toBe(true)
    await store.setAllowed(false)
    expect(write).toHaveBeenLastCalledWith({ allowWithoutAsking: false })
    expect(store.snapshot().allowed).toBe(false)
    await store.setAllowed(true)
    expect(write).toHaveBeenLastCalledWith({ allowWithoutAsking: true })
    expect(store.snapshot().allowed).toBe(true)
    expect(one.mock.calls.length).toBe(two.mock.calls.length)
  })

  it('keeps the confirmed choice on write failure and permits retry', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const store = new ChatMessagingSettingStore(async () => null, write)
    await store.load()
    await store.setAllowed(true)
    expect(store.snapshot()).toMatchObject({ allowed: false, saving: false })
    expect(store.snapshot().error).toContain('could not be saved')
    await store.setAllowed(true)
    expect(store.snapshot()).toMatchObject({ allowed: true, error: null })
  })

  it('blocks writes before the first read, coalesces reads and reports read failure', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null)
    const write = vi.fn()
    const store = new ChatMessagingSettingStore(read, write)
    await store.setAllowed(true)
    expect(write).not.toHaveBeenCalled()
    const first = store.load()
    expect(store.load()).toBe(first)
    await first
    expect(store.snapshot().error).toContain('could not be loaded')
    await store.setAllowed(true)
    expect(write).not.toHaveBeenCalled()
    expect(store.snapshot().ready).toBe(false)
    await store.load()
    expect(store.snapshot()).toMatchObject({ allowed: false, error: null, loading: false })
  })

  it('does not show a grant until saved or allow concurrent writes', async () => {
    let finish: (() => void) | undefined
    const write = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const store = new ChatMessagingSettingStore(async () => null, write)
    await store.load()
    const saving = store.setAllowed(true)
    await store.setAllowed(false)
    expect(write).toHaveBeenCalledTimes(1)
    expect(store.snapshot()).toMatchObject({ allowed: false, saving: true })
    finish?.()
    await saving
    expect(store.snapshot()).toMatchObject({ allowed: true, saving: false })
  })
})
