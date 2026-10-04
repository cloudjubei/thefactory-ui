import { describe, expect, it } from 'vitest'
import { ZERO_BADGE_COUNTS, chatBadgeTally, computeBadgeCounts } from './useBadgeCountsCore'

describe('computeBadgeCounts — processes channel', () => {
  it('reports running and waiting root runs separately', () => {
    const out = computeBadgeCounts({ chats: [], processes: { running: 2, waiting: 1 } })
    expect(out.processesRunning).toBe(2)
    expect(out.processesWaiting).toBe(1)
  })

  it('keeps a waiting-only scope from reading as running', () => {
    const out = computeBadgeCounts({ chats: [], processes: { running: 0, waiting: 1 } })
    expect(out.processesRunning).toBe(0)
    expect(out.processesWaiting).toBe(1)
  })

  it('zeroes both when the processes badge is turned off', () => {
    const out = computeBadgeCounts({
      chats: [],
      processes: { running: 3, waiting: 2 },
      enabled: { processes: false },
    })
    expect(out.processesRunning).toBe(0)
    expect(out.processesWaiting).toBe(0)
  })

  it('zeroes both when no process input is given', () => {
    expect(computeBadgeCounts({ chats: [] })).toEqual(ZERO_BADGE_COUNTS)
  })

  it('does not let another channel toggle gate processes', () => {
    const out = computeBadgeCounts({
      chats: [{ unreadMessages: 2, isThinking: true }],
      processes: { running: 1, waiting: 1 },
      enabled: { chat: false, activity: false },
    })
    expect(out.chat).toBe(0)
    expect(out.chatThinking).toBe(false)
    expect(out.processesRunning).toBe(1)
    expect(out.processesWaiting).toBe(1)
  })
})

describe('computeBadgeCounts — a chat waiting on the user counts as unread', () => {
  it('counts a chat whose only news is a pending ask', () => {
    const counts = computeBadgeCounts({
      chats: [
        { unreadMessages: 0, isThinking: false, pendingAsks: 2 },
        { unreadMessages: 0, isThinking: false },
      ],
    })
    expect(counts.chat).toBe(1)
  })

  it('adds the asks to the unread total', () => {
    const counts = computeBadgeCounts({
      chats: [{ unreadMessages: 1, isThinking: false, pendingAsks: 2 }],
      chatBadgeCountMode: 'total_messages',
    })
    expect(counts.chat).toBe(3)
  })
})

describe('chatBadgeTally', () => {
  const quiet = { unreadMessages: 0, isThinking: false }

  it('counts a chat whose only news is a pending ask as unread', () => {
    expect(chatBadgeTally([{ ...quiet, pendingAsks: 1 }, quiet])).toEqual({
      unread: 1,
      thinking: false,
    })
  })

  it('counts chats, not messages, by default', () => {
    expect(chatBadgeTally([{ ...quiet, unreadMessages: 4, pendingAsks: 2 }]).unread).toBe(1)
  })

  it('adds asks to unread messages in the total-messages mode', () => {
    const chats = [
      { ...quiet, unreadMessages: 4, pendingAsks: 2 },
      { ...quiet, pendingAsks: 1 },
    ]
    expect(chatBadgeTally(chats, 'total_messages').unread).toBe(7)
  })

  it('reports thinking when any chat is streaming, even with nothing unread', () => {
    expect(chatBadgeTally([quiet, { ...quiet, isThinking: true }])).toEqual({
      unread: 0,
      thinking: true,
    })
  })

  it('is empty for no chats', () => {
    expect(chatBadgeTally([])).toEqual({ unread: 0, thinking: false })
  })
})
