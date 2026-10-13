import { describe, expect, it } from 'vitest'
import { ZERO_BADGE_COUNTS, chatBadgeTally, computeBadgeCounts } from './useBadgeCountsCore'

describe('computeBadgeCounts — processes channel', () => {
  it('reports running, waiting and failed root runs separately', () => {
    const out = computeBadgeCounts({ chats: [], processes: { running: 2, waiting: 1, failed: 3 } })
    expect(out.processesRunning).toBe(2)
    expect(out.processesWaiting).toBe(1)
    expect(out.processesFailed).toBe(3)
  })

  it('keeps a waiting-only scope from reading as running', () => {
    const out = computeBadgeCounts({ chats: [], processes: { running: 0, waiting: 1, failed: 0 } })
    expect(out.processesRunning).toBe(0)
    expect(out.processesWaiting).toBe(1)
  })

  it('zeroes all three when the processes badge is turned off', () => {
    const out = computeBadgeCounts({
      chats: [],
      processes: { running: 3, waiting: 2, failed: 1 },
      enabled: { processes: false },
    })
    expect(out.processesRunning).toBe(0)
    expect(out.processesWaiting).toBe(0)
    expect(out.processesFailed).toBe(0)
  })

  it('zeroes both when no process input is given', () => {
    expect(computeBadgeCounts({ chats: [] })).toEqual(ZERO_BADGE_COUNTS)
  })

  it('does not let another channel toggle gate processes', () => {
    const out = computeBadgeCounts({
      chats: [{ unreadMessages: 2, isThinking: true }],
      processes: { running: 1, waiting: 1, failed: 0 },
      enabled: { chat: false, activity: false },
    })
    expect(out.chat).toBe(0)
    expect(out.chatThinking).toBe(false)
    expect(out.processesRunning).toBe(1)
    expect(out.processesWaiting).toBe(1)
  })
})

describe('computeBadgeCounts — a chat waiting on the user', () => {
  it('counts a chat whose only news is a pending ask as unread and as waiting', () => {
    const counts = computeBadgeCounts({
      chats: [
        { unreadMessages: 0, isThinking: false, pendingAsks: 2 },
        { unreadMessages: 3, isThinking: false },
      ],
    })
    expect(counts.chat).toBe(2)
    expect(counts.chatWaiting).toBe(1)
  })

  it('adds the asks to the unread total and counts every ask in the total-messages mode', () => {
    const counts = computeBadgeCounts({
      chats: [{ unreadMessages: 1, isThinking: false, pendingAsks: 2 }],
      chatBadgeCountMode: 'total_messages',
    })
    expect(counts.chat).toBe(3)
    expect(counts.chatWaiting).toBe(2)
  })

  it('zeroes the waiting chats when the chat badge is off', () => {
    const counts = computeBadgeCounts({
      chats: [{ unreadMessages: 1, isThinking: true, pendingAsks: 2 }],
      enabled: { chat: false },
    })
    expect(counts.chatWaiting).toBe(0)
  })
})

describe('chatBadgeTally', () => {
  const quiet = { unreadMessages: 0, isThinking: false }

  it('counts a chat whose only news is a pending ask as unread and waiting', () => {
    expect(chatBadgeTally([{ ...quiet, pendingAsks: 1 }, quiet])).toEqual({
      unread: 1,
      waiting: 1,
      thinking: false,
    })
  })

  it('counts chats, not messages, by default', () => {
    expect(chatBadgeTally([{ ...quiet, unreadMessages: 4, pendingAsks: 2 }])).toEqual({
      unread: 1,
      waiting: 1,
      thinking: false,
    })
  })

  it('does not count a chat with only unread replies as waiting', () => {
    expect(
      chatBadgeTally([
        { ...quiet, unreadMessages: 4 },
        { ...quiet, unreadMessages: 1 },
      ]),
    ).toEqual({
      unread: 2,
      waiting: 0,
      thinking: false,
    })
  })

  it('adds asks to unread messages in the total-messages mode', () => {
    const chats = [
      { ...quiet, unreadMessages: 4, pendingAsks: 2 },
      { ...quiet, pendingAsks: 1 },
    ]
    expect(chatBadgeTally(chats, 'total_messages')).toEqual({
      unread: 7,
      waiting: 3,
      thinking: false,
    })
  })

  it('reports thinking when any chat is streaming, even with nothing unread', () => {
    expect(chatBadgeTally([quiet, { ...quiet, isThinking: true }])).toEqual({
      unread: 0,
      waiting: 0,
      thinking: true,
    })
  })

  it('is empty for no chats', () => {
    expect(chatBadgeTally([])).toEqual({ unread: 0, waiting: 0, thinking: false })
  })
})

describe('computeBadgeCounts — expired sign-ins', () => {
  it('passes the expired logins a scope’s chats and runs use to their own tabs', () => {
    const out = computeBadgeCounts({
      chats: [],
      signIn: { chats: ['Codex'], runs: ['Claude'] },
    })
    expect(out.chatSignInExpired).toEqual(['Codex'])
    expect(out.processesSignInExpired).toEqual(['Claude'])
  })

  it('drops them with their channel’s badge turned off', () => {
    const out = computeBadgeCounts({
      chats: [],
      signIn: { chats: ['Codex'], runs: ['Claude'] },
      enabled: { chat: false, processes: false },
    })
    expect(out.chatSignInExpired).toEqual([])
    expect(out.processesSignInExpired).toEqual([])
  })

  it('is none without a sign-in input', () => {
    const out = computeBadgeCounts({ chats: [] })
    expect(out.chatSignInExpired).toEqual([])
    expect(out.processesSignInExpired).toEqual([])
  })
})
