import { describe, expect, it, vi } from 'vitest'
import { AppFeatureRequestStore } from './appFeatureRequestStore'
import type { AppFeatureRequestDraft } from './appFeatureRequestTypes'

const draft = (title: string): AppFeatureRequestDraft => ({
  targetProjectId: 'thefactory-knowledge',
  title,
  summary: '',
  description: '',
  doneWhen: [],
  references: [],
})

describe('AppFeatureRequestStore', () => {
  it('shows nothing until an app asks', () => {
    expect(new AppFeatureRequestStore().current()).toBeNull()
  })

  it('shows the first ask and keeps the rest waiting behind it, in order', async () => {
    const store = new AppFeatureRequestStore()
    const first = store.enqueue(draft('A'))
    const second = store.enqueue(draft('B'))
    expect(store.current()).toMatchObject({
      draft: draft('A'),
      busy: false,
      error: null,
      waiting: 1,
    })
    store.settle(store.current()!.id, { status: 'declined' })
    await expect(first).resolves.toEqual({ status: 'declined' })
    expect(store.current()).toMatchObject({ draft: draft('B'), waiting: 0 })
    store.settle(store.current()!.id, { status: 'sent', requestId: 'r' })
    await expect(second).resolves.toEqual({ status: 'sent', requestId: 'r' })
    expect(store.current()).toBeNull()
  })

  it('never settles an ask on its own — it waits however long the person takes', async () => {
    vi.useFakeTimers()
    const store = new AppFeatureRequestStore()
    let settled = false
    void store.enqueue(draft('A')).then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(7 * 86_400_000)
    expect(settled).toBe(false)
    vi.useRealTimers()
  })

  it('takes the person’s edits while nothing is sending', () => {
    const store = new AppFeatureRequestStore()
    void store.enqueue(draft('A'))
    const a = store.current()!
    store.edit(a.id, draft('A2'))
    expect(store.current()?.draft.title).toBe('A2')
    expect(store.current()).not.toBe(a)
  })

  it('ignores edits while the request is being sent', () => {
    const store = new AppFeatureRequestStore()
    void store.enqueue(draft('A'))
    const id = store.current()!.id
    store.setBusy(id, true)
    store.edit(id, draft('A2'))
    expect(store.current()?.draft.title).toBe('A')
  })

  it('clears an earlier failure when sending starts again', () => {
    const store = new AppFeatureRequestStore()
    void store.enqueue(draft('A'))
    const id = store.current()!.id
    store.fail(id, 'No network.')
    expect(store.current()).toMatchObject({ busy: false, error: 'No network.' })
    store.setBusy(id, true)
    expect(store.current()).toMatchObject({ busy: true, error: null })
  })

  it('changes only the ask on show', () => {
    const store = new AppFeatureRequestStore()
    void store.enqueue(draft('A'))
    void store.enqueue(draft('B'))
    const behind = store.current()!.id + 1
    store.fail(behind, 'x')
    store.settle(behind, { status: 'declined' })
    expect(store.current()).toMatchObject({ draft: draft('A'), error: null, waiting: 1 })
  })

  it('declines every open ask with the reason when the app goes away', async () => {
    const store = new AppFeatureRequestStore()
    const first = store.enqueue(draft('A'))
    const second = store.enqueue(draft('B'))
    store.declineAll('closed')
    await expect(first).resolves.toEqual({ status: 'declined', reason: 'closed' })
    await expect(second).resolves.toEqual({ status: 'declined', reason: 'closed' })
    expect(store.current()).toBeNull()
  })

  it('tells listeners of every change and stops after unsubscribing', () => {
    const store = new AppFeatureRequestStore()
    const listener = vi.fn()
    const off = store.subscribe(listener)
    void store.enqueue(draft('A'))
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    store.fail(store.current()!.id, 'x')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('tells nobody when there is nothing to decline', () => {
    const store = new AppFeatureRequestStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.declineAll('closed')
    expect(listener).not.toHaveBeenCalled()
  })
})
