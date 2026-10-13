import { describe, expect, it } from 'vitest'
import {
  chatRowBadge,
  chatUnreadMessages,
  computeChatRowStatus,
  isChatUnread,
  markSeen,
  type ChatRowStatus,
  chatNotifyCountsOf,
} from './chatRowStatus'
import { CHAT_AWAITING_ANSWER_LABEL } from './chatUnreadConstants'

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

describe('computeChatRowStatus — an ask waiting on the user', () => {
  const base: Parameters<typeof computeChatRowStatus>[0] = {
    context: { type: 'PROJECT', projectId: 'p' },
    contextKey: '/projects/p',
    chat: { messages: [{ completedAt: '2026-10-02T10:00:00.000Z' }] },
    isSending: false,
    seen: { '/projects/p': '2026-10-02T11:00:00.000Z' },
  }

  it('reads a fully read chat with a pending ask as needing the user, with no unread messages', () => {
    // Observed: a chat read to its end, with the agent's question open, showed
    // a red "1" — as if there were a message the user had not seen.
    expect(computeChatRowStatus({ ...base, pendingAsks: 2 })).toMatchObject({
      isUnread: true,
      unreadCount: 0,
      awaitingAnswer: true,
    })
  })

  it('counts only the unread messages when there are some', () => {
    const status = computeChatRowStatus({
      ...base,
      seen: { '/projects/p': '2026-10-02T09:00:00.000Z' },
      pendingAsks: 1,
    })
    expect(status).toMatchObject({ isUnread: true, unreadCount: 1, awaitingAnswer: true })
  })

  it('leaves a read chat with no ask read', () => {
    expect(computeChatRowStatus(base)).toMatchObject({
      isUnread: false,
      unreadCount: 0,
      awaitingAnswer: false,
    })
  })
})

describe('chatRowBadge', () => {
  const status = (over: Partial<ChatRowStatus>): ChatRowStatus => ({
    isThinking: false,
    isUnread: true,
    unreadCount: 0,
    awaitingAnswer: false,
    isAgentRunning: false,
    needsYou: 0,
    muted: false,
    ...over,
  })

  it('shows "!" for a chat whose messages are all read but which waits on the user', () => {
    expect(chatRowBadge(status({ awaitingAnswer: true }))).toEqual({
      text: '!',
      label: CHAT_AWAITING_ANSWER_LABEL,
    })
  })

  it('shows the unread messages while there are some, ask or not', () => {
    expect(chatRowBadge(status({ unreadCount: 3, awaitingAnswer: true }))).toEqual({
      text: '3',
      label: '3 unread messages',
    })
  })

  it('caps a wide count', () => {
    expect(chatRowBadge(status({ unreadCount: 120 }))?.text).toBe('99+')
  })

  it('shows nothing for a read chat with nothing waiting', () => {
    expect(chatRowBadge(status({ isUnread: false }))).toBeUndefined()
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

describe('computeChatRowStatus — a run chat the manager worked in since it was seen', () => {
  const status = (messages: object[]) =>
    computeChatRowStatus({
      context: { type: 'PROJECT_TOPIC', projectId: 'p' } as never,
      contextKey: 'run',
      chat: { messages: messages as never },
      isSending: false,
      seen: { run: '2026-10-02T10:30:00Z' },
    })
  const managerTurn = [
    { role: 'assistant', completedAt: '2026-10-02T10:00:00Z' },
    { role: 'user', handoffFrom: 'manager', startedAt: '2026-10-02T11:00:00Z' },
    { role: 'assistant', answersHandoffFrom: 'manager', completedAt: '2026-10-02T11:01:00Z' },
  ]

  it('is read: nothing in it was for the person', () => {
    expect(status(managerTurn)).toMatchObject({ isUnread: false, unreadCount: 0 })
  })

  it('is unread by the escalation the manager posted for the person', () => {
    const escalated = [
      ...managerTurn,
      {
        role: 'assistant',
        model: { provider: 'custom', model: 'manager' },
        completedAt: '2026-10-02T11:02:00Z',
      },
    ]
    expect(status(escalated)).toMatchObject({ isUnread: true, unreadCount: 1 })
  })

  it('still waits on the person for an ask its turn raised', () => {
    expect(
      computeChatRowStatus({
        context: { type: 'PROJECT_TOPIC', projectId: 'p' } as never,
        contextKey: 'run',
        chat: { messages: managerTurn as never },
        isSending: false,
        seen: { run: '2026-10-02T10:30:00Z' },
        pendingAsks: 1,
      }),
    ).toMatchObject({ isUnread: true, awaitingAnswer: true, unreadCount: 0 })
  })
})

describe('computeChatRowStatus — at the chat’s notification level', () => {
  const escalation = {
    role: 'assistant',
    managerCard: { kind: 'escalation', escalation: { why: 'judgement' } },
    completedAt: '2026-10-02T11:02:00Z',
  }
  const reply = { role: 'assistant', completedAt: '2026-10-02T11:01:00Z' }
  const status = (level: 'everything' | 'needs-me' | 'nothing', pendingAsks = 0) =>
    computeChatRowStatus({
      context: { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'run-1' } as never,
      contextKey: 'run',
      chat: { messages: [reply, escalation] as never },
      isSending: false,
      seen: { run: '2026-10-02T10:30:00Z' },
      pendingAsks,
      level,
    })

  it('counts every unread message, and what needs the person apart, at everything', () => {
    expect(status('everything', 1)).toMatchObject({
      isUnread: true,
      unreadCount: 2,
      needsYou: 2,
      awaitingAnswer: true,
      muted: false,
    })
  })

  it('counts only what needs the person when it needs them', () => {
    expect(status('needs-me')).toMatchObject({ isUnread: true, unreadCount: 1, needsYou: 1 })
  })

  it('is read when it needs them and nothing does', () => {
    const quiet = computeChatRowStatus({
      context: { type: 'PROJECT', projectId: 'p' },
      contextKey: 'p',
      chat: { messages: [reply] as never },
      isSending: false,
      seen: {},
      level: 'needs-me',
    })
    expect(quiet).toMatchObject({ isUnread: false, unreadCount: 0, needsYou: 0 })
  })

  it('shows nothing at nothing, not even an ask, and says it is muted', () => {
    expect(status('nothing', 2)).toMatchObject({
      isUnread: false,
      unreadCount: 0,
      needsYou: 0,
      awaitingAnswer: false,
      muted: true,
    })
  })

  it('reads a summarised chat’s needs off its summary', () => {
    const summarised = computeChatRowStatus({
      context: { type: 'PROJECT', projectId: 'p' },
      contextKey: 'p',
      chat: {
        messageTimes: ['2026-10-02T11:00:00Z', '2026-10-02T11:05:00Z'],
        needsYouTimes: ['2026-10-02T11:05:00Z'],
      },
      isSending: false,
      seen: { p: '2026-10-02T10:00:00Z' },
      level: 'needs-me',
    })
    expect(summarised).toMatchObject({ unreadCount: 1, needsYou: 1 })
  })

  it('reads at everything when no level is given', () => {
    expect(
      computeChatRowStatus({
        context: { type: 'PROJECT', projectId: 'p' },
        contextKey: 'p',
        chat: { messages: [reply] as never },
        isSending: false,
        seen: {},
      }),
    ).toMatchObject({ unreadCount: 1, needsYou: 0, muted: false })
  })
})

describe('chatNotifyCountsOf', () => {
  const chat = {
    messageTimes: ['2026-10-02T10:00:00Z', '2026-10-02T11:00:00Z', '2026-10-02T12:00:00Z'],
    needsYouTimes: ['2026-10-02T12:00:00Z'],
  }

  it('counts what came after the chat was seen, what of it needs the person, and its asks', () => {
    expect(chatNotifyCountsOf(chat, '2026-10-02T10:30:00Z', 2)).toEqual({
      unreadMessages: 2,
      unreadNeedsYou: 1,
      pendingAsks: 2,
    })
  })

  it('counts everything of a chat never seen', () => {
    expect(chatNotifyCountsOf(chat, undefined, 0)).toEqual({
      unreadMessages: 3,
      unreadNeedsYou: 1,
      pendingAsks: 0,
    })
  })

  it('counts nothing of a chat seen since its last message', () => {
    expect(chatNotifyCountsOf(chat, '2026-10-02T13:00:00Z', 0)).toEqual({
      unreadMessages: 0,
      unreadNeedsYou: 0,
      pendingAsks: 0,
    })
  })

  it('counts no unread message in a chat whose last message has no time', () => {
    expect(
      chatNotifyCountsOf({ messageTimes: ['2026-10-02T10:00:00Z', null] }, undefined, 0),
    ).toMatchObject({ unreadMessages: 0 })
  })
})
