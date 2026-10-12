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

describe('the agents’ own exchange is never unread', () => {
  const run = [
    { role: 'user', startedAt: '2026-10-02T10:00:00.000Z' },
    { role: 'assistant', completedAt: '2026-10-02T10:01:00.000Z' },
    { role: 'user', handoffFrom: 'manager', startedAt: '2026-10-02T11:00:00.000Z' },
    { role: 'assistant', answersHandoffFrom: 'manager', completedAt: '2026-10-02T11:01:00.000Z' },
    { role: 'tool', answersHandoffFrom: 'manager', completedAt: '2026-10-02T11:01:30.000Z' },
    { role: 'assistant', completedAt: '2026-10-02T11:02:00.000Z' },
  ]
  const runChats = { p1: [{ key: 'run', chat: { messages: run } }] }
  const readTo = (iso: string) => () => iso

  it('resumes reading at the first reply for the person, past the manager’s turn', () => {
    expect(firstUnreadMessageIndex(run, '2026-10-02T10:30:00.000Z')).toBe(5)
  })

  it('has nothing to resume at when only agents spoke since', () => {
    expect(firstUnreadMessageIndex(run.slice(0, 5), '2026-10-02T10:30:00.000Z')).toBeNull()
  })

  it('leaves a chat where only agents spoke since out of the unread ones', () => {
    const quiet = { p1: [{ key: 'run', chat: { messages: run.slice(0, 5) } }] }
    expect([...computeUnreadKeys(quiet, readTo('2026-10-02T10:30:00.000Z'))]).toEqual([])
    expect([...computeUnreadKeys(runChats, readTo('2026-10-02T10:30:00.000Z'))]).toEqual(['run'])
  })

  it('counts only replies for the person', () => {
    const counts = computeUnreadCounts(runChats, readTo('2026-10-02T10:30:00.000Z'))
    expect(counts.unreadMessagesByProject.get('p1')).toBe(1)
    expect(computeUnreadCounts(runChats, () => undefined).unreadMessagesByProject.get('p1')).toBe(2)
    expect(unreadCountForChat(runChats, 'run', readTo('2026-10-02T10:30:00.000Z'))).toBe(1)
    expect(unreadCountForChat(runChats, 'run', () => undefined)).toBe(2)
  })
})
