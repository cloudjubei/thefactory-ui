import { describe, expect, it, vi } from 'vitest'
import { LeaveGuardStore } from './leaveGuardStore'

describe('LeaveGuardStore', () => {
  it('runs a leave at once when nothing blocks', () => {
    const store = new LeaveGuardStore()
    const proceed = vi.fn()
    store.request(proceed)
    expect(proceed).toHaveBeenCalledTimes(1)
    expect(store.pendingMessage()).toBeNull()
  })

  it('holds a leave behind a blocker and asks with its message', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'This app has unsaved changes. Leave anyway?')
    const proceed = vi.fn()
    store.request(proceed)
    expect(proceed).not.toHaveBeenCalled()
    expect(store.pendingMessage()).toBe('This app has unsaved changes. Leave anyway?')
  })

  it('runs the held leave on confirm and clears the question', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'Unsaved')
    const proceed = vi.fn()
    store.request(proceed)
    store.confirm()
    expect(proceed).toHaveBeenCalledTimes(1)
    expect(store.pendingMessage()).toBeNull()
    store.confirm()
    expect(proceed).toHaveBeenCalledTimes(1)
  })

  it('drops the held leave on cancel and keeps blocking', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'Unsaved')
    const proceed = vi.fn()
    store.request(proceed)
    store.cancel()
    expect(proceed).not.toHaveBeenCalled()
    expect(store.pendingMessage()).toBeNull()
    expect(store.blockingMessage()).toBe('Unsaved')
  })

  it('lets leaves made while a confirmed leave runs through, and blocks again after', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'Unsaved')
    const inner = vi.fn()
    store.request(() => {
      expect(store.blockingMessage()).toBeNull()
      store.request(inner)
    })
    store.confirm()
    expect(inner).toHaveBeenCalledTimes(1)
    expect(store.blockingMessage()).toBe('Unsaved')
    const later = vi.fn()
    store.request(later)
    expect(later).not.toHaveBeenCalled()
  })

  it('blocks again after a confirmed leave that throws', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'Unsaved')
    store.request(() => {
      throw new Error('navigation failed')
    })
    expect(() => store.confirm()).toThrow('navigation failed')
    expect(store.blockingMessage()).toBe('Unsaved')
  })

  it('keeps only the latest held leave', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'Unsaved')
    const first = vi.fn()
    const second = vi.fn()
    store.request(first)
    store.request(second)
    store.confirm()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('asks with the newest blocker while several block, and stops when all clear', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('a', 'First app unsaved')
    store.setBlocker('b', 'Second app unsaved')
    expect(store.blockingMessage()).toBe('Second app unsaved')
    store.setBlocker('b', null)
    expect(store.blockingMessage()).toBe('First app unsaved')
    store.setBlocker('a', null)
    expect(store.blockingMessage()).toBeNull()
    const proceed = vi.fn()
    store.request(proceed)
    expect(proceed).toHaveBeenCalledTimes(1)
  })

  it('updates a blocker message in place', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'Unsaved')
    store.setBlocker('app', '3 edits not saved')
    expect(store.blockingMessage()).toBe('3 edits not saved')
  })

  it('keeps asking a held question when its blocker clears meanwhile', () => {
    const store = new LeaveGuardStore()
    store.setBlocker('app', 'Unsaved')
    const proceed = vi.fn()
    store.request(proceed)
    store.setBlocker('app', null)
    expect(store.pendingMessage()).toBe('Unsaved')
    store.confirm()
    expect(proceed).toHaveBeenCalledTimes(1)
  })

  it('tells subscribers about real changes only', () => {
    const store = new LeaveGuardStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.setBlocker('app', 'Unsaved')
    store.setBlocker('app', 'Unsaved')
    store.setBlocker('other', null)
    expect(listener).toHaveBeenCalledTimes(1)
    store.request(() => {})
    expect(listener).toHaveBeenCalledTimes(2)
    store.cancel()
    store.cancel()
    expect(listener).toHaveBeenCalledTimes(3)
    store.request(() => {})
    store.confirm()
    expect(listener).toHaveBeenCalledTimes(5)
    unsubscribe()
    store.setBlocker('app', null)
    expect(listener).toHaveBeenCalledTimes(5)
  })
})
