import { describe, expect, it, vi } from 'vitest'
import {
  appUnreadForProject,
  appUnreadSnapshot,
  setAppUnreadCount,
  subscribeAppUnread,
} from './appUnreadStore'

describe('appUnreadStore', () => {
  it('keeps each project’s count and tells its readers', () => {
    const listener = vi.fn()
    const stop = subscribeAppUnread(listener)
    setAppUnreadCount('refs', 2)
    setAppUnreadCount('web', 1)
    expect(appUnreadForProject(appUnreadSnapshot(), 'refs')).toBe(2)
    expect(appUnreadForProject(appUnreadSnapshot(), 'web')).toBe(1)
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
  })

  it('tells no one, and keeps its snapshot, when a count did not change', () => {
    setAppUnreadCount('same', 3)
    const before = appUnreadSnapshot()
    const listener = vi.fn()
    const stop = subscribeAppUnread(listener)
    setAppUnreadCount('same', 3)
    expect(listener).not.toHaveBeenCalled()
    expect(appUnreadSnapshot()).toBe(before)
    stop()
  })

  it('stops telling a reader that left', () => {
    const listener = vi.fn()
    subscribeAppUnread(listener)()
    setAppUnreadCount('left', 4)
    expect(listener).not.toHaveBeenCalled()
  })

  it('counts none for a project not counted yet, or no project', () => {
    expect(appUnreadForProject(appUnreadSnapshot(), 'never')).toBe(0)
    expect(appUnreadForProject({ refs: 2 }, undefined)).toBe(0)
  })
})
