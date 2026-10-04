import { describe, expect, it } from 'vitest'
import {
  computeUnreadCounts,
  computeUnreadKeys,
  firstUnreadMessageIndex,
  unreadCountForChat,
} from './chatUnread'

const msgs = [
  { role: 'user', startedAt: '2026-10-02T10:00:00.000Z' },
  { role: 'assistant', completedAt: '2026-10-02T10:01:00.000Z' },
  { role: 'user', startedAt: '2026-10-02T11:00:00.000Z' },
  { role: 'assistant', completedAt: '2026-10-02T11:01:00.000Z' },
  { role: 'assistant', completedAt: '2026-10-02T11:02:00.000Z' },
]
const chats = {
  p1: [
    { key: 'read', chat: { messages: msgs } },
    { key: 'behind', chat: { messages: msgs } },
    {
      key: 'silent',
      chat: { messages: [{ role: 'user', startedAt: '2026-10-02T10:00:00.000Z' }] },
    },
  ],
}
const lastRead: Record<string, string> = {
  read: '2026-10-02T12:00:00.000Z',
  behind: '2026-10-02T10:30:00.000Z',
}
const getLastRead = (key: string) => lastRead[key]

describe('firstUnreadMessageIndex — where reading resumes', () => {
  it('is the first reply newer than the last read, not the last one', () => {
    expect(firstUnreadMessageIndex(msgs, '2026-10-02T10:30:00.000Z')).toBe(3)
  })

  it('skips the user’s own messages, which are never unread', () => {
    expect(firstUnreadMessageIndex(msgs, '2026-10-02T10:01:00.000Z')).toBe(3)
  })

  it('is null when everything has been read, or nothing was ever read', () => {
    expect(firstUnreadMessageIndex(msgs, '2026-10-02T12:00:00.000Z')).toBeNull()
    expect(firstUnreadMessageIndex(msgs, undefined)).toBeNull()
  })
})

describe('computeUnreadKeys', () => {
  it('lists the chats with a reply newer than their last read', () => {
    expect([...computeUnreadKeys(chats, getLastRead)]).toEqual(['behind'])
  })
})

describe('computeUnreadCounts', () => {
  it('counts unread chats and unread replies per project', () => {
    const counts = computeUnreadCounts(chats, getLastRead)
    expect(counts.unreadChatsByProject.get('p1')).toBe(1)
    expect(counts.unreadMessagesByProject.get('p1')).toBe(2)
  })
})

describe('unreadCountForChat', () => {
  it('counts the unread replies of one chat', () => {
    expect(unreadCountForChat(chats, 'behind', getLastRead)).toBe(2)
    expect(unreadCountForChat(chats, 'read', getLastRead)).toBe(0)
  })
})
