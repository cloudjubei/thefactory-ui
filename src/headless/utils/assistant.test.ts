import { describe, expect, it } from 'vitest'
import type { ChatContext } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'

import {
  assistantConversationRows,
  assistantExpiredSignIns,
  assistantNavIndicator,
} from './assistant'
import { ASSISTANT_COPY, assistantNewRepliesTitle } from './assistantConstants'
import type { AssistantChat, AssistantRow, AssistantRowStatus } from './assistantTypes'

const QUIET: AssistantRowStatus = {
  isThinking: false,
  unreadCount: 0,
  needsYou: 0,
  muted: false,
}

const general = (timestamp: string): ChatContext => ({ type: 'GENERAL', timestamp })

function conversation(timestamp: string, over: Partial<AssistantChat> = {}): AssistantChat {
  return {
    context: general(timestamp),
    createdAt: new Date(Number(timestamp)).toISOString(),
    messageCount: 1,
    messageTimes: [new Date(Number(timestamp) + 1000).toISOString()],
    ...over,
  }
}

const rows = (
  chats: readonly AssistantChat[],
  opts: {
    archived?: boolean
    open?: ChatContext
    status?: (chat: AssistantChat) => AssistantRowStatus
  } = {},
) =>
  assistantConversationRows({
    chats,
    archived: opts.archived ?? false,
    ...(opts.open ? { open: opts.open } : {}),
    statusOf: opts.status ?? (() => QUIET),
  })

describe('assistantConversationRows', () => {
  it('lists the conversations newest first, each with its title and last activity', () => {
    const older = conversation('1000', { title: 'Rename the group' })
    const newer = conversation('5000', { title: 'What needs me today' })
    expect(rows([older, newer])).toEqual([
      {
        key: getChatContextKey(newer.context),
        context: newer.context,
        title: 'What needs me today',
        at: new Date(6000).toISOString(),
        isNew: false,
        fresh: false,
        needsYou: 0,
        running: false,
        hidden: false,
        muted: false,
      },
      expect.objectContaining({ title: 'Rename the group' }),
    ])
  })

  it('leaves out every chat that is not an Assistant conversation', () => {
    const project = { ...conversation('9000'), context: { type: 'PROJECT', projectId: 'p' } }
    expect(rows([project as AssistantChat, conversation('1000')]).map((r) => r.key)).toEqual([
      getChatContextKey(general('1000')),
    ])
  })

  it('shows archived conversations only in the archived view', () => {
    const shown = conversation('1000')
    const hidden = conversation('2000', { listHiddenAt: '2026-10-01T00:00:00.000Z' })
    expect(rows([shown, hidden]).map((r) => r.key)).toEqual([getChatContextKey(shown.context)])
    expect(rows([shown, hidden], { archived: true })).toEqual([
      expect.objectContaining({ key: getChatContextKey(hidden.context), hidden: true }),
    ])
  })

  it('names a conversation nobody wrote in yet a new one, and an older untitled one plainly', () => {
    const empty = conversation('2000', { messageCount: 0, messageTimes: [] })
    const untitled = conversation('1000', { title: '   ' })
    expect(rows([empty, untitled]).map((r) => [r.title, r.isNew])).toEqual([
      [ASSISTANT_COPY.newConversation, true],
      [ASSISTANT_COPY.untitled, false],
    ])
  })

  it('reads a loaded conversation’s messages for whether anyone wrote in it', () => {
    const loaded = conversation('1000', { messageCount: undefined, messages: [] })
    expect(rows([loaded])[0].isNew).toBe(true)
  })

  it('falls back to when the conversation began when no message has a time', () => {
    const quiet = conversation('1000', { messageTimes: [], updatedAt: null })
    expect(rows([quiet])[0].at).toBe(new Date(1000).toISOString())
  })

  it('carries what reaches the person: news, what waits on them, an agent replying', () => {
    const busy = conversation('1000')
    const status = () => ({ isThinking: true, unreadCount: 2, needsYou: 1, muted: false })
    expect(rows([busy], { status })[0]).toMatchObject({ fresh: true, needsYou: 1, running: true })
  })

  it('counts nothing waiting in a conversation set to tell the person nothing', () => {
    const muted = conversation('1000')
    const status = () => ({ isThinking: false, unreadCount: 0, needsYou: 3, muted: true })
    expect(rows([muted], { status })[0]).toMatchObject({ needsYou: 0, muted: true })
  })

  it('keeps the archived view quiet', () => {
    const hidden = conversation('1000', { listHiddenAt: '2026-10-01T00:00:00.000Z' })
    const status = () => ({ isThinking: true, unreadCount: 2, needsYou: 1, muted: false })
    expect(rows([hidden], { archived: true, status })[0]).toMatchObject({
      fresh: false,
      needsYou: 0,
      running: false,
    })
  })

  it('puts the conversation being started at the top before anything is written in it', () => {
    const existing = conversation('1000')
    const fresh = general('9000')
    expect(rows([existing], { open: fresh })[0]).toEqual({
      key: getChatContextKey(fresh),
      context: fresh,
      title: ASSISTANT_COPY.newConversation,
      isNew: true,
      fresh: false,
      needsYou: 0,
      running: false,
      hidden: false,
      muted: false,
    })
  })

  it('does not add the open conversation twice once it exists', () => {
    const existing = conversation('1000')
    expect(rows([existing], { open: existing.context })).toHaveLength(1)
  })

  it('adds no new conversation to the archived view, nor for a chat that is not the Assistant’s', () => {
    expect(rows([], { archived: true, open: general('9000') })).toEqual([])
    expect(rows([], { open: { type: 'PROJECT', projectId: 'p' } })).toEqual([])
  })
})

describe('assistantNavIndicator', () => {
  const row = (over: Partial<AssistantRow>): AssistantRow => ({
    key: 'k',
    context: general('1'),
    title: 't',
    isNew: false,
    fresh: false,
    needsYou: 0,
    running: false,
    hidden: false,
    muted: false,
    ...over,
  })

  it('shows nothing while no conversation has news', () => {
    expect(assistantNavIndicator([row({}), row({})])).toEqual({ kind: 'none' })
  })

  it('shows a blue dot, saying how many conversations have a new reply', () => {
    expect(assistantNavIndicator([row({ fresh: true }), row({})])).toEqual({
      kind: 'dot',
      title: assistantNewRepliesTitle(1),
    })
    expect(assistantNavIndicator([row({ fresh: true }), row({ fresh: true })])).toEqual({
      kind: 'dot',
      title: assistantNewRepliesTitle(2),
    })
  })

  it('counts what waits on the person in chat ink, over any dot', () => {
    const indicator = assistantNavIndicator([
      row({ needsYou: 2, fresh: true }),
      row({ needsYou: 1 }),
    ])
    expect(indicator).toMatchObject({
      kind: 'ink',
      badge: { parts: [{ channel: 'chat', count: 3 }], rollup: false },
    })
  })

  it('shows an agent replying as moving ink', () => {
    expect(assistantNavIndicator([row({ running: true })])).toMatchObject({
      kind: 'ink',
      badge: { parts: [], running: 'chat' },
    })
  })

  it('turns red for an expired sign-in its conversations use, saying which', () => {
    expect(
      assistantNavIndicator([row({ running: true }), row({ needsYou: 1 })], ['Claude']),
    ).toEqual({
      kind: 'ink',
      badge: { parts: [{ channel: 'failed', count: 2 }], running: 'chat', rollup: false },
      title: 'Claude sign-in expired · 1 chat needs you · an agent is replying',
    })
  })
})

describe('assistantExpiredSignIns', () => {
  const signIns = {
    logins: [
      { id: 'a', cli: 'claude-code', authStatus: { authenticated: false } },
      { id: 'x', cli: 'codex', authStatus: { authenticated: false } },
    ],
    active: { activeCli: null, activeCliCredentialId: null },
  }
  const row = (key: string, over: Partial<AssistantRow> = {}): AssistantRow => ({
    key: getChatContextKey(general(key)),
    context: general(key),
    title: key,
    isNew: false,
    fresh: false,
    needsYou: 0,
    running: false,
    hidden: false,
    muted: false,
    ...over,
  })
  const chat = (key: string, tool: string) => ({
    ...conversation(key),
    cliRunner: { tool },
  })

  it('names the expired sign-ins of conversations an agent replies in or that wait on the person', () => {
    expect(
      assistantExpiredSignIns(
        [row('1', { running: true }), row('2', { needsYou: 1 }), row('3', { fresh: true })],
        [chat('1', 'claude-code'), chat('2', 'claude-code'), chat('3', 'codex')],
        signIns,
      ),
    ).toEqual(['Claude'])
  })

  it('is none when no live conversation uses one', () => {
    expect(
      assistantExpiredSignIns([row('1', { running: true })], [conversation('1')], signIns),
    ).toEqual([])
  })
})

describe('assistantNewRepliesTitle', () => {
  it('reads one reply and several', () => {
    expect(assistantNewRepliesTitle(1)).toBe('New reply in a conversation')
    expect(assistantNewRepliesTitle(3)).toBe('New replies in 3 conversations')
  })
})
