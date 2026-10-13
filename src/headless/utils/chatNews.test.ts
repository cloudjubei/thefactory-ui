import { describe, expect, it } from 'vitest'
import { getChatContextKey } from 'thefactory-tools/utils'
import { chatAsksNewsSince, chatNewsSince } from './chatNews'
import type { ChatNewsEntry } from './chatNewsTypes'

const since = '2026-10-12T10:00:00Z'
const project = { type: 'PROJECT', projectId: 'p' } as ChatNewsEntry['context']
const runChat = {
  type: 'PROJECT_TOPIC',
  projectId: 'p',
  topicId: 'run',
} as ChatNewsEntry['context']
const agentRun = {
  type: 'AGENT_RUN_STORY',
  projectId: 'p',
  storyId: 's',
  agentRunId: 'a',
} as ChatNewsEntry['context']
const entry = (context: ChatNewsEntry['context'], messages: object[]): ChatNewsEntry => ({
  context,
  messages: messages as ChatNewsEntry['messages'],
})
const reply = (at: string) => ({ role: 'assistant', completedAt: at })
const managerBrief = (at: string) => ({ role: 'user', handoffFrom: 'manager', startedAt: at })
const managerReply = (at: string) => ({
  role: 'assistant',
  answersHandoffFrom: 'manager',
  completedAt: at,
})

describe('chatNewsSince', () => {
  it('finds no news in what was there before it looked', () => {
    const out = chatNewsSince([entry(project, [reply('2026-10-12T09:00:00Z')])], new Map(), since)
    expect(out.arrived).toBe(false)
    expect(out.marks.get(getChatContextKey(project))).toBe('2026-10-12T09:00:00Z')
  })

  it('finds news in a reply for the person that came after', () => {
    const marks = new Map([[getChatContextKey(project), '2026-10-12T09:00:00Z']])
    const out = chatNewsSince(
      [entry(project, [reply('2026-10-12T09:00:00Z'), reply('2026-10-12T10:05:00Z')])],
      marks,
      since,
    )
    expect(out.arrived).toBe(true)
    expect(out.marks.get(getChatContextKey(project))).toBe('2026-10-12T10:05:00Z')
  })

  it('finds news in a chat that arrived with a message for the person', () => {
    const intro = { role: 'user', startedAt: '2026-10-12T10:01:00Z' }
    expect(chatNewsSince([entry(project, [intro])], new Map(), since).arrived).toBe(true)
  })

  it('finds none in the manager’s brief and the turn that answers it', () => {
    const out = chatNewsSince(
      [
        entry(runChat, [
          reply('2026-10-12T09:00:00Z'),
          managerBrief('2026-10-12T10:01:00Z'),
          managerReply('2026-10-12T10:02:00Z'),
        ]),
      ],
      new Map([[getChatContextKey(runChat), '2026-10-12T09:00:00Z']]),
      since,
    )
    expect(out.arrived).toBe(false)
  })

  it('finds news in the escalation the manager posted for the person', () => {
    const escalation = {
      role: 'assistant',
      model: { provider: 'custom', model: 'manager' },
      completedAt: '2026-10-12T10:03:00Z',
    }
    const out = chatNewsSince(
      [entry(runChat, [managerBrief('2026-10-12T10:01:00Z'), escalation])],
      new Map(),
      since,
    )
    expect(out.arrived).toBe(true)
  })

  it('never finds news in an agent-run chat, which never lights a badge', () => {
    expect(
      chatNewsSince([entry(agentRun, [reply('2026-10-12T10:05:00Z')])], new Map(), since).arrived,
    ).toBe(false)
  })

  it('reads a summarised chat by its times, newest of them, a missing time aside', () => {
    const summarised: ChatNewsEntry = {
      context: project,
      messageTimes: ['2026-10-12T10:07:00Z', null, '2026-10-12T10:06:00Z'],
    }
    const out = chatNewsSince([summarised], new Map(), since)
    expect(out.arrived).toBe(true)
    expect(out.marks.get(getChatContextKey(project))).toBe('2026-10-12T10:07:00Z')
  })

  it('keeps no mark for a chat with nothing for the person', () => {
    const out = chatNewsSince([entry(project, []), { context: runChat }], new Map(), since)
    expect(out).toEqual({ arrived: false, marks: new Map() })
  })
})

describe('chatNewsSince — at each chat’s notification level', () => {
  const escalation = (at: string) => ({
    role: 'assistant',
    managerCard: { kind: 'escalation', escalation: { why: 'judgement' } },
    completedAt: at,
  })

  it('finds no news in a reply for a chat that tells only what needs the person', () => {
    const out = chatNewsSince(
      [entry(project, [reply('2026-10-12T10:05:00Z')])],
      new Map(),
      since,
      () => 'needs-me',
    )
    expect(out.arrived).toBe(false)
  })

  it('finds news in what needs the person there, and marks it', () => {
    const out = chatNewsSince(
      [entry(runChat, [reply('2026-10-12T10:09:00Z'), escalation('2026-10-12T10:05:00Z')])],
      new Map(),
      since,
      () => 'needs-me',
    )
    expect(out.arrived).toBe(true)
    expect(out.marks.get(getChatContextKey(runChat))).toBe('2026-10-12T10:05:00Z')
  })

  it('finds none at all in a chat set to nothing, and keeps no mark for it', () => {
    const out = chatNewsSince(
      [entry(project, [reply('2026-10-12T10:05:00Z'), escalation('2026-10-12T10:06:00Z')])],
      new Map(),
      since,
      () => 'nothing',
    )
    expect(out).toEqual({ arrived: false, marks: new Map() })
  })

  it('reads each chat at its own level', () => {
    const levels = new Map([
      [getChatContextKey(project), 'nothing' as const],
      [getChatContextKey(runChat), 'everything' as const],
    ])
    const out = chatNewsSince(
      [
        entry(project, [reply('2026-10-12T10:05:00Z')]),
        entry(runChat, [reply('2026-10-12T10:06:00Z')]),
      ],
      new Map(),
      since,
      (chat) => levels.get(getChatContextKey(chat.context))!,
    )
    expect(out.arrived).toBe(true)
    expect([...out.marks.keys()]).toEqual([getChatContextKey(runChat)])
  })
})

describe('chatAsksNewsSince', () => {
  const everything = () => 'everything' as const

  it('finds news when a chat has more asks waiting than when it last looked', () => {
    const out = chatAsksNewsSince(new Map([['a', 2]]), new Map([['a', 1]]), everything)
    expect(out.arrived).toBe(true)
    expect(out.marks).toEqual(new Map([['a', 2]]))
  })

  it('finds news in a chat that had none waiting before', () => {
    expect(chatAsksNewsSince(new Map([['a', 1]]), new Map(), everything).arrived).toBe(true)
  })

  it('finds none when asks were answered or stayed the same', () => {
    expect(
      chatAsksNewsSince(
        new Map([
          ['a', 1],
          ['b', 0],
        ]),
        new Map([
          ['a', 1],
          ['b', 3],
        ]),
        everything,
      ).arrived,
    ).toBe(false)
  })

  it('finds none in a chat set to nothing, yet keeps its count so it never fires later', () => {
    const out = chatAsksNewsSince(new Map([['a', 4]]), new Map(), () => 'nothing')
    expect(out).toEqual({ arrived: false, marks: new Map([['a', 4]]) })
  })

  it('finds news at needs-me, an ask being what needs the person', () => {
    expect(chatAsksNewsSince(new Map([['a', 1]]), new Map(), () => 'needs-me').arrived).toBe(true)
  })
})
