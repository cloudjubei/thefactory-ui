import { describe, expect, it } from 'vitest'
import { chatUnreadMessages, computeChatRowStatus, isChatUnread, markSeen } from './chatRowStatus'

describe('markSeen', () => {
  it('returns a new object with the new value', () => {
    const before = { 'projects/p1': '2026-01-01T00:00:00Z' }
    const after = markSeen(before, 'projects/p1', '2026-05-02T10:00:00Z')
    expect(after).toEqual({ 'projects/p1': '2026-05-02T10:00:00Z' })
    expect(after).not.toBe(before)
  })

  it('returns the same reference when value is unchanged', () => {
    const before = { 'projects/p1': '2026-05-02T10:00:00Z' }
    const after = markSeen(before, 'projects/p1', '2026-05-02T10:00:00Z')
    expect(after).toBe(before)
  })
})

describe('isChatUnread', () => {
  it('is false when there are no messages', () => {
    expect(isChatUnread({}, 'projects/p1', undefined)).toBe(false)
  })

  it('is true when there are messages and never-seen', () => {
    expect(isChatUnread({}, 'projects/p1', '2026-05-02T10:00:00Z')).toBe(true)
  })

  it('is true when latest message is newer than seen', () => {
    const map = { 'projects/p1': '2026-05-02T09:00:00Z' }
    expect(isChatUnread(map, 'projects/p1', '2026-05-02T10:00:00Z')).toBe(true)
  })

  it('is false when seen timestamp matches or exceeds latest message', () => {
    const map = { 'projects/p1': '2026-05-02T10:00:00Z' }
    expect(isChatUnread(map, 'projects/p1', '2026-05-02T10:00:00Z')).toBe(false)
    expect(isChatUnread(map, 'projects/p1', '2026-05-02T09:00:00Z')).toBe(false)
  })
})

describe('computeChatRowStatus — an ask waiting on the user counts as unread', () => {
  const base: Parameters<typeof computeChatRowStatus>[0] = {
    context: { type: 'PROJECT', projectId: 'p' },
    contextKey: '/projects/p',
    chat: { messages: [{ completedAt: '2026-10-02T10:00:00.000Z' }] },
    isSending: false,
    seen: { '/projects/p': '2026-10-02T11:00:00.000Z' },
  }

  it('reads a fully read chat with a pending ask as unread, counting the ask', () => {
    expect(computeChatRowStatus({ ...base, pendingAsks: 2 })).toMatchObject({
      isUnread: true,
      unreadCount: 2,
    })
  })

  it('adds the asks to the unread replies', () => {
    const status = computeChatRowStatus({
      ...base,
      seen: { '/projects/p': '2026-10-02T09:00:00.000Z' },
      pendingAsks: 1,
    })
    expect(status).toMatchObject({ isUnread: true, unreadCount: 2 })
  })

  it('leaves a read chat with no ask read', () => {
    expect(computeChatRowStatus(base)).toMatchObject({ isUnread: false, unreadCount: 0 })
  })
})

describe('chatUnreadMessages', () => {
  it('counts the messages after the seen mark', () => {
    expect(chatUnreadMessages(['a', 'b', 'c'], 'a')).toBe(2)
  })

  it('counts every message of a chat never seen', () => {
    expect(chatUnreadMessages(['a', null, 'c'], undefined)).toBe(3)
  })

  it('skips a message without a time', () => {
    expect(chatUnreadMessages([null, 'c'], 'a')).toBe(1)
  })
})

describe('computeChatRowStatus — a chat not loaded, only summarised', () => {
  it('reads unread news off the summary’s message times', () => {
    const status = computeChatRowStatus({
      context: { type: 'PROJECT', projectId: 'p' },
      contextKey: '/projects/p',
      chat: { messageTimes: ['2026-10-02T10:00:00Z', '2026-10-02T11:00:00Z'] },
      isSending: false,
      seen: { '/projects/p': '2026-10-02T10:30:00Z' },
    })
    expect(status).toMatchObject({ isUnread: true, unreadCount: 1 })
  })
})
