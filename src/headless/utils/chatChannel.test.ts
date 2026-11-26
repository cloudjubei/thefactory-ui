import { describe, expect, it } from 'vitest'
import type { ChatContext, ProcessRun } from 'thefactory-tools/types'
import { getChatContextKey } from 'thefactory-tools/utils'

import { processTallyByProject } from './badgeAggregation'
import {
  chatBadgeInputOf,
  chatChannelOf,
  processRunChatNewsByRun,
  processRunChatNewsOf,
} from './chatChannel'
import { DEFAULT_CHAT_NOTIFY_LEVELS } from './chatNotifyConstants'
import { processRunListRow } from './processRunAttention'

const runChat: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'run-r1' }
const otherRunChat: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'run-r2' }
const topic: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'ideas' }
const project: ChatContext = { type: 'PROJECT', projectId: 'p' }
const group: ChatContext = { type: 'GROUP', groupId: 'g' }
const stepAgent: ChatContext = {
  type: 'AGENT_RUN_FEATURE',
  projectId: 'p',
  storyId: 's',
  featureId: 'f',
  agentRunId: 'a1',
}

describe('chatChannelOf', () => {
  it('counts a process run’s own chat, and its step agents’ chats, on Processes', () => {
    expect(chatChannelOf(runChat)).toBe('processes')
    expect(chatChannelOf(stepAgent)).toBe('processes')
  })

  it('counts every other chat on Chat', () => {
    for (const context of [topic, project, group]) expect(chatChannelOf(context)).toBe('chat')
  })
})

describe('chatBadgeInputOf', () => {
  const news = { unreadMessages: 3, pendingAsks: 2, isThinking: true }

  it('brings the Chat channel nothing of a chat that counts on Processes', () => {
    expect(chatBadgeInputOf(runChat, news)).toEqual({
      unreadMessages: 0,
      pendingAsks: 0,
      isThinking: false,
    })
    expect(chatBadgeInputOf(stepAgent, news)).toEqual({
      unreadMessages: 0,
      pendingAsks: 0,
      isThinking: false,
    })
  })

  it('passes a chat that counts on Chat through whole', () => {
    expect(chatBadgeInputOf(topic, news)).toEqual(news)
  })
})

describe('processRunChatNewsByRun', () => {
  it('holds each run’s own chat news by run id', () => {
    const byRun = processRunChatNewsByRun([
      { context: runChat, unreadMessages: 2, pendingAsks: 1 },
      { context: otherRunChat, unreadMessages: 0 },
    ])
    expect([...byRun]).toEqual([
      ['r1', { unread: 2, asks: 1 }],
      ['r2', { unread: 0, asks: 0 }],
    ])
  })

  it('leaves out step agents’ chats — their asks are the run’s own stop — and every other chat', () => {
    const byRun = processRunChatNewsByRun([
      { context: stepAgent, unreadMessages: 4, pendingAsks: 1 },
      { context: topic, unreadMessages: 4, pendingAsks: 1 },
      { context: project, unreadMessages: 1 },
    ])
    expect(byRun.size).toBe(0)
  })
})

describe('processRunChatNewsOf — a run’s own chat, read at its level', () => {
  const KEY = getChatContextKey(runChat)
  const routine = Array.from(
    { length: 40 },
    (_, i) => `2026-10-12T10:${String(i).padStart(2, '0')}:00Z`,
  )
  const card = '2026-10-12T11:00:00Z'
  const noAsks = new Map<string, number>()
  const read = (over: Partial<Parameters<typeof processRunChatNewsOf>[1]> = {}) => ({
    pendingAsks: noAsks,
    levels: DEFAULT_CHAT_NOTIFY_LEVELS,
    ...over,
  })
  const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
    ({
      id: 'r1',
      projectId: 'p',
      title: 'Review',
      status: 'running',
      loopCounts: {},
      ledger: [],
      startedAt: 0,
      updatedAt: 0,
      plan: {
        definitionId: 'd',
        definitionScope: 'global',
        definitionVersion: 1,
        name: 'Review',
        steps: [{ id: 'review', name: 'Review', kind: 'agent', agentType: 'developer' }],
        loops: [],
        frozenAt: 0,
      },
      ...over,
    }) as ProcessRun

  it('holds nothing unread however many routine messages its agent wrote, seen or never opened', () => {
    const chat = { context: runChat, messageTimes: routine, needsYouTimes: [] }
    expect(processRunChatNewsOf([chat], read()).get('r1')).toEqual({ unread: 0, asks: 0 })
    expect(processRunChatNewsOf([chat], read({ seen: { [KEY]: routine[3]! } })).get('r1')).toEqual({
      unread: 0,
      asks: 0,
    })
  })

  it('so the run’s row carries no dot and Processes counts nothing unread', () => {
    const news = processRunChatNewsOf(
      [{ context: runChat, messageTimes: routine, needsYouTimes: [] }],
      read(),
    )
    expect(processRunListRow(run(), 1_000, news.get('r1')).fresh).toBe(false)
    expect(processTallyByProject([run()], 1_000, news).get('p')).toEqual({
      running: 1,
      waiting: 0,
      failed: 0,
      unread: 0,
    })
    expect(processTallyByProject([run({ status: 'succeeded' })], 1_000, news).size).toBe(0)
  })

  it('holds a message that needs the person, until it is seen', () => {
    const chat = { context: runChat, messageTimes: [...routine, card], needsYouTimes: [card] }
    expect(processRunChatNewsOf([chat], read()).get('r1')).toEqual({ unread: 1, asks: 0 })
    expect(processRunChatNewsOf([chat], read({ seen: { [KEY]: card } })).get('r1')).toEqual({
      unread: 0,
      asks: 0,
    })
  })

  it('holds the asks waiting in it, read or not', () => {
    const chat = { context: runChat, messageTimes: routine, needsYouTimes: [] }
    const asks = new Map([[KEY, 2]])
    expect(
      processRunChatNewsOf([chat], read({ pendingAsks: asks, seen: { [KEY]: routine[39]! } })).get(
        'r1',
      ),
    ).toEqual({ unread: 0, asks: 2 })
  })

  it('holds every message once the person asked for everything — for run chats, or for this one', () => {
    const chat = { context: runChat, messageTimes: routine, needsYouTimes: [] }
    const everything = { ...DEFAULT_CHAT_NOTIFY_LEVELS, run: 'everything' as const }
    expect(processRunChatNewsOf([chat], read({ levels: everything })).get('r1')?.unread).toBe(40)
    expect(
      processRunChatNewsOf([{ ...chat, notifyLevel: 'everything' as const }], read()).get('r1')
        ?.unread,
    ).toBe(40)
  })

  it('holds nothing of a chat set to nothing, not even its asks', () => {
    const chat = {
      context: runChat,
      messageTimes: [card],
      needsYouTimes: [card],
      notifyLevel: 'nothing' as const,
    }
    expect(
      processRunChatNewsOf([chat], read({ pendingAsks: new Map([[KEY, 1]]) })).get('r1'),
    ).toEqual({ unread: 0, asks: 0 })
  })

  it('reads only runs’ own chats', () => {
    const news = processRunChatNewsOf(
      [
        { context: topic, messageTimes: routine, needsYouTimes: routine },
        { context: stepAgent, messageTimes: routine, needsYouTimes: routine },
        { context: otherRunChat, messageTimes: [], needsYouTimes: [] },
      ],
      read(),
    )
    expect([...news.keys()]).toEqual(['r2'])
  })
})
