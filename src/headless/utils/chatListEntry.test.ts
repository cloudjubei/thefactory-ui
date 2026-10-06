import { describe, expect, it } from 'vitest'
import {
  byLastActivity,
  chatLastActivityAt,
  chatMessageCount,
  chatMessageTimes,
  isChatLoaded,
  type ChatListEntry,
  type ChatSummaryLike,
  withAppendedMessage,
  withSummary,
} from './chatListEntry'

const ctx = { type: 'PROJECT' as const, projectId: 'p' }
const loaded = (n: number, updatedAt = 'u1'): ChatListEntry => ({
  context: ctx,
  updatedAt,
  messages: Array.from({ length: n }, (_, i) => ({
    role: 'user' as const,
    content: `m${i}`,
    startedAt: `s${i}`,
    ...(i === 0 ? { completedAt: 'c0' } : {}),
  })),
})
const summary = (n: number, updatedAt = 'u1'): ChatSummaryLike => ({
  context: ctx,
  updatedAt,
  title: 'T',
  messageCount: n,
  messageTimes: Array.from({ length: n }, (_, i) => `t${i}`),
})

describe('chat list entries', () => {
  it('counts a loaded chat by its messages, a summary by its count', () => {
    expect(chatMessageCount(loaded(3))).toBe(3)
    expect(chatMessageCount(summary(5))).toBe(5)
    expect(chatMessageCount({})).toBe(0)
  })

  it('times a loaded chat’s messages as finished-else-begun, a summary by its times', () => {
    expect(chatMessageTimes(loaded(2))).toEqual(['c0', 's1'])
    expect(chatMessageTimes(summary(2))).toEqual(['t0', 't1'])
  })

  it('tells a loaded chat from a summary', () => {
    expect(isChatLoaded(loaded(0))).toBe(true)
    expect(isChatLoaded(summary(0))).toBe(false)
  })
})

describe('withSummary', () => {
  it('is the summary for a chat not loaded', () => {
    expect(withSummary(undefined, summary(2))).toEqual(summary(2))
    expect(withSummary(summary(1), summary(2))).toEqual(summary(2))
  })

  it('keeps the messages of a loaded chat the summary says has not changed', () => {
    const next = withSummary(loaded(2), summary(2))
    expect(next.messages).toHaveLength(2)
    expect(next.title).toBe('T')
  })

  it('drops the messages of a loaded chat that has since changed, so it is read again', () => {
    expect(isChatLoaded(withSummary(loaded(2), summary(3)))).toBe(false)
    expect(isChatLoaded(withSummary(loaded(2, 'u1'), summary(2, 'u2')))).toBe(false)
  })
})

describe('withAppendedMessage', () => {
  const message = { role: 'user' as const, content: 'new' }

  it('appends to a loaded chat', () => {
    expect(withAppendedMessage(loaded(1), message).messages).toHaveLength(2)
  })

  it('leaves a summary alone — one message is not the chat', () => {
    const entry = summary(4)
    expect(withAppendedMessage(entry, message)).toBe(entry)
  })
})

describe('chatLastActivityAt', () => {
  it('is the newest message, even when the chat was marked updated earlier', () => {
    // Observed: a chat whose reply landed last listed below one updated a
    // minute before it.
    expect(
      chatLastActivityAt({
        updatedAt: '2026-10-06T20:09:33.704Z',
        messageTimes: ['2026-10-06T20:00:00.000Z', '2026-10-06T20:10:56.441Z'],
      }),
    ).toBe('2026-10-06T20:10:56.441Z')
  })

  it('is the newest message, not a later edit that added none', () => {
    expect(
      chatLastActivityAt({
        updatedAt: '2026-10-05T23:51:01.563Z',
        messages: [{ completedAt: '2026-10-05T08:12:51.953Z' }],
      }),
    ).toBe('2026-10-05T08:12:51.953Z')
  })

  it('falls back to when the chat was updated, then created, while it has no timed message', () => {
    expect(chatLastActivityAt({ updatedAt: 'u', createdAt: 'c', messageTimes: [null] })).toBe('u')
    expect(chatLastActivityAt({ createdAt: 'c' })).toBe('c')
  })
})

describe('byLastActivity', () => {
  it('lists the chat with the newest message first, to the millisecond', () => {
    const older = { messageTimes: ['2026-10-06T20:10:56.400Z'] }
    const newer = { messageTimes: ['2026-10-06T20:10:56.441Z'] }
    expect([older, newer].sort(byLastActivity)).toEqual([newer, older])
  })
})
