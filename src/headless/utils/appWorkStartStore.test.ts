import { describe, expect, it, vi } from 'vitest'
import { AppWorkStartStore } from './appWorkStartStore'
import type { AppWorkStartDraft } from './appWorkStartTypes'

const draft = (title: string): AppWorkStartDraft => ({ title, description: '', features: [] })

describe('AppWorkStartStore', () => {
  it('shows nothing until an app asks', () => {
    expect(new AppWorkStartStore().current()).toBeNull()
  })

  it('shows the first ask and keeps the rest waiting behind it, in order', async () => {
    const store = new AppWorkStartStore()
    const first = store.enqueue(draft('A'))
    const second = store.enqueue(draft('B'))
    expect(store.current()).toMatchObject({
      draft: draft('A'),
      progress: {},
      busy: false,
      error: null,
      waiting: 1,
    })
    store.settle(store.current()!.id, { status: 'declined' })
    await expect(first).resolves.toEqual({ status: 'declined' })
    expect(store.current()).toMatchObject({ draft: draft('B'), waiting: 0 })
    store.settle(store.current()!.id, { status: 'started', storyId: 's' })
    await expect(second).resolves.toEqual({ status: 'started', storyId: 's' })
    expect(store.current()).toBeNull()
  })

  it('never settles an ask on its own — it waits however long the person takes', async () => {
    vi.useFakeTimers()
    const store = new AppWorkStartStore()
    let settled = false
    void store.enqueue(draft('A')).then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(7 * 86_400_000)
    expect(settled).toBe(false)
    expect(store.current()?.draft.title).toBe('A')
    vi.useRealTimers()
  })

  it('keeps the same snapshot until something changes', () => {
    const store = new AppWorkStartStore()
    void store.enqueue(draft('A'))
    const a = store.current()
    expect(store.current()).toBe(a)
    store.edit(a!.id, draft('A2'))
    expect(store.current()).not.toBe(a)
    expect(store.current()?.draft.title).toBe('A2')
  })

  it('tells listeners of every change and stops after unsubscribing', () => {
    const store = new AppWorkStartStore()
    const listener = vi.fn()
    const off = store.subscribe(listener)
    void store.enqueue(draft('A'))
    const id = store.current()!.id
    store.setBusy(id, true)
    store.fail(id, 'boom')
    expect(listener).toHaveBeenCalledTimes(3)
    off()
    store.settle(id, { status: 'declined' })
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('records progress and a failure, and clears the error and busy flag on failing', () => {
    const store = new AppWorkStartStore()
    void store.enqueue(draft('A'))
    const id = store.current()!.id
    store.setBusy(id, true)
    store.setProgress(id, { storyId: 's1' })
    store.fail(id, 'start-work refused')
    expect(store.current()).toMatchObject({
      busy: false,
      error: 'start-work refused',
      progress: { storyId: 's1' },
    })
    store.setBusy(id, true)
    expect(store.current()).toMatchObject({ busy: true, error: null })
  })

  it('ignores edits once the story exists or while starting', () => {
    const store = new AppWorkStartStore()
    void store.enqueue(draft('A'))
    const id = store.current()!.id
    store.setBusy(id, true)
    store.edit(id, draft('busy edit'))
    expect(store.current()?.draft.title).toBe('A')
    store.setBusy(id, false)
    store.setProgress(id, { storyId: 's1' })
    store.edit(id, draft('late edit'))
    expect(store.current()?.draft.title).toBe('A')
  })

  it('ignores calls for an ask that is no longer shown', async () => {
    const store = new AppWorkStartStore()
    const first = store.enqueue(draft('A'))
    void store.enqueue(draft('B'))
    const staleId = store.current()!.id
    store.settle(staleId, { status: 'declined' })
    await first
    store.settle(staleId, { status: 'started', storyId: 'x' })
    store.fail(staleId, 'x')
    store.edit(staleId, draft('x'))
    expect(store.current()).toMatchObject({ draft: draft('B'), error: null })
  })

  it('declines every ask with the reason when the app goes away', async () => {
    const store = new AppWorkStartStore()
    const a = store.enqueue(draft('A'))
    const b = store.enqueue(draft('B'))
    store.declineAll('closed')
    await expect(a).resolves.toEqual({ status: 'declined', reason: 'closed' })
    await expect(b).resolves.toEqual({ status: 'declined', reason: 'closed' })
    expect(store.current()).toBeNull()
  })

  it('makes no noise declining when nothing is asked', () => {
    const store = new AppWorkStartStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.declineAll('closed')
    expect(listener).not.toHaveBeenCalled()
  })
})
