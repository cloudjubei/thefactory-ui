import { describe, expect, it } from 'vitest'
import type { ChatContext, ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import { getChatContextKey, processRunChatContext } from 'thefactory-tools/utils'

import {
  byChatListAttention,
  chatListBackNotice,
  chatListFilterCounts,
  chatListHiddenNotice,
  chatListPool,
  chatListRow,
  chatListSections,
  isChatInChatList,
  isChatInScopePool,
  matchesChatListFilter,
  withChatListHidden,
} from './chatList'
import { CHAT_LIST_COPY, chatListShownNotice } from './chatListConstants'
import type {
  ChatListChat,
  ChatListFilter,
  ChatListPlacement,
  ChatListRow,
  ChatListRowInput,
  ChatListScope,
} from './chatListTypes'
import { computeChatRowStatus } from './chatRowStatus'

const QUIET = {
  isThinking: false,
  isAgentRunning: false,
  unreadCount: 0,
  needsYou: 0,
  muted: false,
  retired: false,
}

function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'run-1',
    projectId: 'p1',
    storyId: 's7',
    title: 'Let unit tests watch their files',
    plan: {
      definitionId: 'd',
      definitionScope: 'global',
      definitionVersion: 1,
      name: 'Story delivery',
      steps: [
        { id: 'impl', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'signoff', name: 'Sign-off', kind: 'gate' },
      ],
      loops: [],
      frozenAt: 0,
    },
    status: 'running',
    cursor: { stepId: 'impl' } as ProcessRun['cursor'],
    loopCounts: {},
    ledger: [
      {
        id: 'e1',
        stepId: 'impl',
        iteration: 1,
        status: 'running',
        startedAt: 0,
      } as ProcessLedgerEntry,
    ],
    startedAt: 0,
    updatedAt: 0,
    ...over,
  } as ProcessRun
}

const PROJECT: ChatContext = { type: 'PROJECT', projectId: 'p1' }
const TOPIC: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p1', topicId: 't1' }
const STORY: ChatContext = { type: 'STORY', projectId: 'p1', storyId: 's4' }
const FEATURE: ChatContext = { type: 'FEATURE', projectId: 'p1', storyId: 's3', featureId: 'f2' }
const REQUEST: ChatContext = { type: 'FEATURE_REQUEST', projectId: 'p1', featureRequestId: 'r1' }
const GROUP: ChatContext = { type: 'GROUP', groupId: 'g1' }
const GROUP_TOPIC: ChatContext = { type: 'GROUP_TOPIC', groupId: 'g1', topicId: 'gt' }
const RUN_CHAT = processRunChatContext(run())

const NOW = 1_000

function row(input: Partial<ChatListRowInput> & { chat: ChatListRowInput['chat'] }): ChatListRow {
  return chatListRow({ status: QUIET, now: NOW, ...input })
}

describe('isChatInChatList', () => {
  it.each([PROJECT, TOPIC, STORY, FEATURE, REQUEST, GROUP, GROUP_TOPIC, RUN_CHAT])(
    'lists a %o chat',
    (context) => {
      expect(isChatInChatList(context)).toBe(true)
    },
  )

  it('leaves out the assistant’s conversations — they have a page of their own', () => {
    expect(isChatInChatList({ type: 'GENERAL', timestamp: '1' })).toBe(false)
  })

  it('leaves out an agent run’s own chat — its process drives it', () => {
    const agentRun: ChatContext = {
      type: 'AGENT_RUN_STORY',
      projectId: 'p1',
      storyId: 's1',
      agentRunId: 'a1',
    }
    expect(isChatInChatList(agentRun)).toBe(false)
  })
})

describe('chatListRow — what a row says', () => {
  it('names the project chat after its project', () => {
    expect(row({ chat: { context: PROJECT }, projectName: 'TheFactory Tools' })).toMatchObject({
      kind: 'project',
      title: 'TheFactory Tools Chat',
      sub: 'Project chat',
    })
  })

  it('names a topic by its own title', () => {
    expect(row({ chat: { context: TOPIC, title: 'Release notes draft' } })).toMatchObject({
      kind: 'topic',
      title: 'Release notes draft',
      sub: 'Topic',
    })
  })

  it('names a run chat by its run, with its status pill and step', () => {
    expect(row({ chat: { context: RUN_CHAT, title: 'old title' }, run: run() })).toMatchObject({
      kind: 'run',
      title: 'Let unit tests watch their files',
      sub: 'Implement',
      pill: { label: 'Running' },
    })
  })

  it('says what a stopped run waits on, with no badge — its stop counts on Processes', () => {
    const parked = run({
      status: 'parked',
      park: { reason: 'step-waiting', message: 'Which branch to merge?', parkedAt: 0 },
    } as Partial<ProcessRun>)
    expect(row({ chat: { context: RUN_CHAT }, run: parked })).toMatchObject({
      sub: 'Which branch to merge?',
      pill: { label: 'Needs you' },
      needsYou: 0,
      running: false,
      fresh: false,
    })
  })

  it('pills a run whose stop its manager has as the manager’s', () => {
    const managed = run({
      status: 'parked',
      park: { reason: 'step-failed', message: 'Implement failed.', parkedAt: 0 },
      manager: {
        turn: { runId: 'run-1', parkedAt: 0, signature: 's', startedAt: 900, chatContextId: 'c' },
      },
    } as Partial<ProcessRun>)
    expect(row({ chat: { context: RUN_CHAT }, run: managed }).pill).toEqual({
      label: 'Manager on it',
      tone: 'running',
    })
  })

  it('names a run chat whose run is not read yet by its stored title', () => {
    expect(row({ chat: { context: RUN_CHAT, title: 'Close stash gaps' } })).toMatchObject({
      title: 'Close stash gaps',
      sub: 'Process run',
    })
  })

  it('names a story chat by its story, with the story’s status', () => {
    const work = { title: 'Agent-to-agent chat messaging', status: 'in_progress', ref: '#4' }
    expect(row({ chat: { context: STORY }, work })).toMatchObject({
      kind: 'story',
      title: 'Agent-to-agent chat messaging',
      sub: 'Story #4',
      pill: { label: 'In progress', tone: 'working' },
    })
  })

  it('pills a started feature chat as In progress, never Working', () => {
    const work = { title: 'Typed resolver', status: 'in_progress', ref: '#3.1' }
    const shown = row({ chat: { context: FEATURE }, work })
    expect(shown.pill).toEqual({ label: 'In progress', tone: 'working' })
    expect(shown.running).toBe(false)
  })

  it('names a feature chat by its feature', () => {
    const work = { title: 'Process references in chat', status: 'pending', ref: '#3.2' }
    expect(row({ chat: { context: FEATURE }, work })).toMatchObject({
      kind: 'feature',
      title: 'Process references in chat',
      sub: 'Feature #3.2',
      pill: { label: 'Pending' },
    })
  })

  it('falls back to the story’s number while the story is not read', () => {
    expect(row({ chat: { context: STORY } }).title).toMatch(/^Story #/)
    expect(row({ chat: { context: STORY } }).pill).toBeUndefined()
  })

  it('names an incoming request by its title', () => {
    expect(row({ chat: { context: REQUEST, title: 'Shared approval card' } })).toMatchObject({
      kind: 'request',
      title: 'Shared approval card',
      sub: 'Incoming request',
    })
  })

  it('names a group’s main chat General, and a group topic by its title', () => {
    expect(row({ chat: { context: GROUP }, groupName: 'TheFactory' })).toMatchObject({
      kind: 'group',
      title: 'General',
      sub: 'TheFactory group chat',
    })
    expect(row({ chat: { context: GROUP_TOPIC, title: 'Release train' } })).toMatchObject({
      title: 'Release train',
      sub: 'Group topic',
    })
  })

  it('carries the project it belongs to', () => {
    expect(
      row({ chat: { context: TOPIC }, projectName: 'TheFactory UI', projectIcon: 'palette' }),
    ).toMatchObject({ projectId: 'p1', projectName: 'TheFactory UI', projectIcon: 'palette' })
  })

  it('keys a row by its chat', () => {
    expect(row({ chat: { context: TOPIC } }).key).toBe(getChatContextKey(TOPIC))
  })
})

describe('chatListRow — what a row shows of its state', () => {
  it('counts what waits on the person in the chat', () => {
    expect(row({ chat: { context: TOPIC }, status: { ...QUIET, needsYou: 2 } }).needsYou).toBe(2)
  })

  it('shows no badge on a process run’s chat, whatever waits, runs or is unread in it', () => {
    const parked = run({
      status: 'parked',
      park: { reason: 'gate', message: 'Sign off', parkedAt: 0 },
    } as Partial<ProcessRun>)
    const busy = { ...QUIET, needsYou: 1, unreadCount: 2, isThinking: true, isAgentRunning: true }
    for (const r of [parked, run()]) {
      expect(row({ chat: { context: RUN_CHAT }, run: r, status: busy })).toMatchObject({
        needsYou: 0,
        running: false,
        fresh: false,
      })
    }
    const stepAgent: ChatContext = {
      type: 'AGENT_RUN_STORY',
      projectId: 'p1',
      storyId: 's7',
      agentRunId: 'a1',
    }
    expect(row({ chat: { context: stepAgent }, status: busy })).toMatchObject({
      needsYou: 0,
      running: false,
      fresh: false,
    })
  })

  it('shows nothing waiting in a chat the person muted, and says it is muted', () => {
    const muted = row({ chat: { context: TOPIC }, status: { ...QUIET, needsYou: 2, muted: true } })
    expect(muted.needsYou).toBe(0)
    expect(muted.muted).toBe(true)
    expect(row({ chat: { context: TOPIC } }).muted).toBe(false)
  })

  it('runs while its agent is thinking, in chat ink', () => {
    expect(row({ chat: { context: TOPIC }, status: { ...QUIET, isThinking: true } })).toMatchObject(
      { running: true, runningChannel: 'chat' },
    )
  })

  it('runs while an agent run in it works', () => {
    expect(
      row({ chat: { context: TOPIC }, status: { ...QUIET, isAgentRunning: true } }).running,
    ).toBe(true)
  })

  it('is still once its run finished', () => {
    expect(row({ chat: { context: RUN_CHAT }, run: run({ status: 'succeeded' }) }).running).toBe(
      false,
    )
  })

  it('is new while it has unread messages', () => {
    expect(row({ chat: { context: TOPIC }, status: { ...QUIET, unreadCount: 3 } }).fresh).toBe(true)
    expect(row({ chat: { context: TOPIC } }).fresh).toBe(false)
  })

  it('is hidden once the person archived it from the list', () => {
    expect(row({ chat: { context: TOPIC, listHiddenAt: '2026-10-12T00:00:00Z' } }).hidden).toBe(
      true,
    )
    expect(row({ chat: { context: TOPIC, listHiddenAt: null } }).hidden).toBe(false)
  })

  it('is retired while it is closed with nothing calling the person back', () => {
    const closed = { context: REQUEST, archivedAt: '2026-10-20T14:00:00Z' }
    expect(row({ chat: closed, status: { ...QUIET, retired: true } }).retired).toBe(true)
    expect(row({ chat: closed, status: { ...QUIET, needsYou: 1 } }).retired).toBe(false)
  })

  it('keeps a run chat retired though what waits in it is told on its run', () => {
    expect(
      row({ chat: { context: RUN_CHAT }, run: run(), status: { ...QUIET, retired: true } }).retired,
    ).toBe(true)
  })

  it('reads its last activity from its messages, else its own times', () => {
    expect(
      row({
        chat: {
          context: TOPIC,
          messageTimes: ['2026-10-12T10:00:00Z'],
          updatedAt: '2026-10-01T00:00:00Z',
        },
      }).lastActivityAt,
    ).toBe('2026-10-12T10:00:00Z')
  })
})

function listRow(over: Partial<ChatListRow>): ChatListRow {
  return {
    key: over.key ?? 'k',
    context: TOPIC,
    kind: 'topic',
    kindLabel: 'Topic',
    title: 'T',
    sub: '',
    needsYou: 0,
    running: false,
    runningChannel: 'chat',
    fresh: false,
    hidden: false,
    muted: false,
    retired: false,
    projectId: 'p1',
    ...over,
  }
}

describe('byChatListAttention', () => {
  it('puts what needs the person first, then what runs, then the most recent', () => {
    const rows = [
      listRow({ key: 'old', lastActivityAt: '2026-10-01T00:00:00Z' }),
      listRow({ key: 'running', running: true, lastActivityAt: '2026-09-01T00:00:00Z' }),
      listRow({ key: 'recent', lastActivityAt: '2026-10-12T00:00:00Z' }),
      listRow({ key: 'needs', needsYou: 1, lastActivityAt: '2026-08-01T00:00:00Z' }),
      listRow({ key: 'never' }),
    ]
    expect([...rows].sort(byChatListAttention).map((r) => r.key)).toEqual([
      'needs',
      'running',
      'recent',
      'old',
      'never',
    ])
  })
})

describe('matchesChatListFilter', () => {
  it.each([
    ['all', listRow({}), true],
    ['all', listRow({ kind: 'run', context: RUN_CHAT }), false],
    ['needs-you', listRow({ kind: 'run', context: RUN_CHAT, needsYou: 1 }), false],
    ['running', listRow({ kind: 'run', context: RUN_CHAT, running: true }), false],
    ['runs', listRow({ kind: 'run', context: RUN_CHAT }), true],
    ['needs-you', listRow({ needsYou: 1 }), true],
    ['needs-you', listRow({}), false],
    ['running', listRow({ running: true }), true],
    ['running', listRow({}), false],
    ['runs', listRow({ kind: 'run' }), true],
    ['runs', listRow({ kind: 'story' }), false],
    ['stories', listRow({ kind: 'story' }), true],
    ['stories', listRow({ kind: 'feature' }), true],
    ['stories', listRow({ kind: 'run' }), false],
  ] as const)('%s keeps %o: %s', (filter, r, kept) => {
    expect(matchesChatListFilter(r, filter)).toBe(kept)
  })
})

describe('chatListFilterCounts', () => {
  it('counts each filter’s rows', () => {
    const rows = [
      listRow({ kind: 'run', context: RUN_CHAT, needsYou: 1 }),
      listRow({ kind: 'run', context: RUN_CHAT, running: true }),
      listRow({ kind: 'story', running: true, needsYou: 1 }),
      listRow({ kind: 'feature' }),
      listRow({ kind: 'project' }),
    ]
    expect(chatListFilterCounts(rows)).toEqual({
      all: 3,
      'needs-you': 1,
      running: 1,
      runs: 2,
      stories: 2,
    })
  })
})

describe('chatListSections — one project', () => {
  const scope: ChatListScope = { kind: 'project', projectId: 'p1' }

  it('lists the project’s chats in one section, most urgent first', () => {
    const rows = [
      listRow({ key: 'a', lastActivityAt: '2026-10-12T00:00:00Z' }),
      listRow({ key: 'b', needsYou: 1 }),
    ]
    expect(chatListSections({ rows, scope, filter: 'all', archived: false })).toEqual([
      { id: 'chats', rows: [rows[1], rows[0]] },
    ])
  })

  it('leaves out other projects’ chats and group chats', () => {
    const rows = [
      listRow({ key: 'mine' }),
      listRow({ key: 'other', projectId: 'p2' }),
      listRow({ key: 'group', kind: 'group', context: GROUP, projectId: undefined }),
    ]
    const [section] = chatListSections({ rows, scope, filter: 'all', archived: false })
    expect(section?.rows.map((r) => r.key)).toEqual(['mine'])
  })

  it('leaves out the chats the person archived from the list', () => {
    const rows = [listRow({ key: 'shown' }), listRow({ key: 'hidden', hidden: true })]
    const [section] = chatListSections({ rows, scope, filter: 'all', archived: false })
    expect(section?.rows.map((r) => r.key)).toEqual(['shown'])
  })

  it('narrows to the chosen filter', () => {
    const rows = [
      listRow({ key: 'run', kind: 'run', context: RUN_CHAT }),
      listRow({ key: 'story', kind: 'story' }),
    ]
    const [section] = chatListSections({ rows, scope, filter: 'runs', archived: false })
    expect(section?.rows.map((r) => r.key)).toEqual(['run'])
    const [all] = chatListSections({ rows, scope, filter: 'all', archived: false })
    expect(all?.rows.map((r) => r.key)).toEqual(['story'])
  })

  it('shows only the archived chats in the archived view, without their badges', () => {
    const rows = [
      listRow({ key: 'shown' }),
      listRow({ key: 'hidden', hidden: true, needsYou: 2, running: true, fresh: true }),
    ]
    expect(chatListSections({ rows, scope, filter: 'running', archived: true })).toEqual([
      {
        id: 'archived',
        rows: [{ ...rows[1], needsYou: 0, running: false, fresh: false }],
      },
    ])
  })
})

describe('chatListSections — a group', () => {
  const scope: ChatListScope = { kind: 'group', groupId: 'g1', projectIds: ['p1', 'p2'] }
  const groupMain = listRow({ key: 'general', kind: 'group', context: GROUP, projectId: undefined })
  const otherGroup = listRow({
    key: 'other-group',
    kind: 'group',
    context: { type: 'GROUP', groupId: 'g2' },
    projectId: undefined,
  })
  const asking = listRow({ key: 'asking', projectId: 'p2', needsYou: 1 })
  const working = listRow({ key: 'working', projectId: 'p1', running: true })
  const askingAndWorking = listRow({ key: 'both', projectId: 'p1', needsYou: 1, running: true })
  const quiet = listRow({ key: 'quiet', projectId: 'p1' })
  const outside = listRow({ key: 'outside', projectId: 'p9', needsYou: 1 })

  it('shows the group’s own chats, then what needs the person and what runs in its projects', () => {
    const rows = [groupMain, otherGroup, asking, working, askingAndWorking, quiet, outside]
    const sections = chatListSections({ rows, scope, filter: 'all', archived: false })
    expect(sections.map((s) => [s.id, s.label, s.rows.map((r) => r.key)])).toEqual([
      ['group-chats', CHAT_LIST_COPY.groupChats, ['general']],
      ['group-needs-you', CHAT_LIST_COPY.groupNeedsYou, ['both', 'asking']],
      ['group-running', CHAT_LIST_COPY.groupRunning, ['working']],
    ])
  })

  it('lists its projects’ run chats only under Runs, in their own section', () => {
    const runChat = listRow({ key: 'run', kind: 'run', context: RUN_CHAT, projectId: 'p1' })
    const outsideRun = listRow({ key: 'run-out', kind: 'run', context: RUN_CHAT, projectId: 'p9' })
    const rows = [groupMain, asking, runChat, outsideRun]
    const runs = chatListSections({ rows, scope, filter: 'runs', archived: false })
    expect(runs.map((s) => [s.id, s.label, s.rows.map((r) => r.key)])).toEqual([
      ['group-runs', CHAT_LIST_COPY.groupRuns, ['run']],
    ])
    const all = chatListSections({ rows, scope, filter: 'all', archived: false })
    expect(all.flatMap((s) => s.rows.map((r) => r.key))).toEqual(['general', 'asking'])
    expect(chatListFilterCounts(chatListPool(rows, scope, false))).toMatchObject({
      all: 2,
      runs: 1,
    })
  })

  it('drops a section with nothing in it', () => {
    const sections = chatListSections({ rows: [groupMain], scope, filter: 'all', archived: false })
    expect(sections.map((s) => s.id)).toEqual(['group-chats'])
  })

  it('narrows every section to the chosen filter', () => {
    const rows = [groupMain, asking, working]
    const sections = chatListSections({ rows, scope, filter: 'running', archived: false })
    expect(sections.map((s) => s.id)).toEqual(['group-running'])
  })

  it('shows the group’s own archived chats in the archived view', () => {
    const hiddenTopic = listRow({
      key: 'hidden-topic',
      kind: 'group',
      context: GROUP_TOPIC,
      projectId: undefined,
      hidden: true,
    })
    const hiddenProjectChat = listRow({
      key: 'hidden-p',
      projectId: 'p1',
      hidden: true,
      needsYou: 1,
      running: true,
    })
    const sections = chatListSections({
      rows: [groupMain, hiddenTopic, hiddenProjectChat],
      scope,
      filter: 'all',
      archived: true,
    })
    expect(sections.map((s) => s.rows.map((r) => r.key))).toEqual([['hidden-topic']])
  })
})

describe('chatListHiddenNotice', () => {
  it('says where the chat went, with Undo bringing it back', () => {
    expect(chatListHiddenNotice(TOPIC, 'Release notes')).toEqual({
      text: CHAT_LIST_COPY.hidden,
      undo: TOPIC,
    })
  })

  it('names an Assistant conversation it archived, with Undo', () => {
    const conversation: ChatContext = { type: 'GENERAL', timestamp: '1' }
    expect(chatListHiddenNotice(conversation, 'Set up git')).toEqual({
      text: 'Archived “Set up git”.',
      undo: conversation,
    })
    expect(chatListHiddenNotice(conversation).text).toBe('Conversation archived.')
  })
})

describe('chatListBackNotice', () => {
  it('says a chat is back in the list, by name', () => {
    expect(chatListBackNotice(TOPIC, 'Release notes')).toEqual({
      text: chatListShownNotice('Release notes'),
    })
  })

  it('says an Assistant conversation is back in conversations', () => {
    const conversation: ChatContext = { type: 'GENERAL', timestamp: '1' }
    expect(chatListBackNotice(conversation, 'Set up git')).toEqual({
      text: '“Set up git” is back in conversations.',
    })
    expect(chatListBackNotice(conversation).text).toBe('The conversation is back in conversations.')
  })
})

describe('withChatListHidden', () => {
  type Entry = ChatListPlacement & { context: ChatContext }
  const AT = '2026-10-21T08:00:00Z'

  it('stamps the time the chat left the list', () => {
    const entry: Entry = { context: TOPIC }
    expect(withChatListHidden(entry, true, AT)).toEqual({ context: TOPIC, listHiddenAt: AT })
  })

  it('drops when the person last put a closed chat back, once they hide it', () => {
    const entry: Entry = {
      context: REQUEST,
      archivedAt: '2026-10-20T14:00:00Z',
      listShownAt: '2026-10-20T15:00:00Z',
    }
    expect(withChatListHidden(entry, true, AT)).toEqual({
      context: REQUEST,
      archivedAt: '2026-10-20T14:00:00Z',
      listHiddenAt: AT,
    })
  })

  it('drops the stamp when the chat is back in the list', () => {
    const entry: Entry = { context: TOPIC, listHiddenAt: '2026-10-12T00:00:00Z' }
    expect(withChatListHidden(entry, false, AT)).toEqual({ context: TOPIC })
  })

  it('stamps a closed chat the person puts back, so it stays in the list', () => {
    const entry: Entry = { context: REQUEST, archivedAt: '2026-10-20T14:00:00Z' }
    expect(withChatListHidden(entry, false, AT)).toEqual({
      context: REQUEST,
      archivedAt: '2026-10-20T14:00:00Z',
      listShownAt: AT,
    })
  })
})

describe('chatListShownNotice', () => {
  it('names the chat that is back', () => {
    expect(chatListShownNotice('Release notes')).toBe('“Release notes” is back in your list.')
  })

  it('says a chat is back when it has no name of its own', () => {
    expect(chatListShownNotice(undefined)).toBe('The chat is back in your list.')
  })
})

describe('chatListPool', () => {
  const group: ChatListScope = { kind: 'group', groupId: 'g1', projectIds: ['p1'] }
  const groupMain = listRow({ key: 'general', kind: 'group', context: GROUP, projectId: undefined })

  it('draws a project’s list from its own chats still in the list', () => {
    const rows = [listRow({ key: 'in' }), listRow({ key: 'out', hidden: true })]
    expect(
      chatListPool(rows, { kind: 'project', projectId: 'p1' }, false).map((r) => r.key),
    ).toEqual(['in'])
  })

  it('draws the archived view from the chats hidden from the list', () => {
    const rows = [listRow({ key: 'in' }), listRow({ key: 'out', hidden: true })]
    expect(
      chatListPool(rows, { kind: 'project', projectId: 'p1' }, true).map((r) => r.key),
    ).toEqual(['out'])
  })

  it('draws the closed chats nothing calls back into the archived view, beside the hidden', () => {
    const rows = [
      listRow({ key: 'live' }),
      listRow({ key: 'closed', kind: 'request', context: REQUEST, retired: true }),
      listRow({ key: 'hidden', hidden: true }),
      listRow({ key: 'both', retired: true, hidden: true }),
    ]
    const project: ChatListScope = { kind: 'project', projectId: 'p1' }
    expect(chatListPool(rows, project, false).map((r) => r.key)).toEqual(['live'])
    expect(chatListPool(rows, project, true).map((r) => r.key)).toEqual([
      'closed',
      'hidden',
      'both',
    ])
  })

  it('leaves a closed chat of a group’s project out of both the group’s views', () => {
    const closed = listRow({ key: 'closed', retired: true, kind: 'run', context: RUN_CHAT })
    expect(chatListPool([groupMain, closed], group, false).map((r) => r.key)).toEqual(['general'])
    expect(chatListPool([groupMain, closed], group, true)).toEqual([])
  })

  it('draws a group’s own closed chat into the group’s archived view', () => {
    const closedTopic = listRow({
      key: 'closed-topic',
      kind: 'group',
      context: GROUP_TOPIC,
      projectId: undefined,
      retired: true,
    })
    expect(chatListPool([groupMain, closedTopic], group, false).map((r) => r.key)).toEqual([
      'general',
    ])
    expect(chatListPool([groupMain, closedTopic], group, true).map((r) => r.key)).toEqual([
      'closed-topic',
    ])
  })

  it('leaves a quiet chat of a group’s project out of the group’s list', () => {
    const rows = [groupMain, listRow({ key: 'quiet' }), listRow({ key: 'busy', running: true })]
    expect(chatListPool(rows, group, false).map((r) => r.key)).toEqual(['general', 'busy'])
  })

  it('leaves out a row with no project when it is not the group’s own', () => {
    const stray = listRow({ key: 'stray', projectId: undefined, needsYou: 1 })
    expect(chatListPool([stray], group, false)).toEqual([])
  })
})

describe('isChatInScopePool — which chats a scope can list at all', () => {
  const OTHER_STORY: ChatContext = { type: 'STORY', projectId: 'p2', storyId: 's1' }
  const OTHER_GROUP: ChatContext = { type: 'GROUP', groupId: 'g2' }
  const projectScope: ChatListScope = { kind: 'project', projectId: 'p1' }
  const groupScope: ChatListScope = { kind: 'group', groupId: 'g1', projectIds: ['p1', 'p3'] }
  const all = [
    PROJECT,
    TOPIC,
    STORY,
    FEATURE,
    REQUEST,
    GROUP,
    GROUP_TOPIC,
    RUN_CHAT,
    OTHER_STORY,
    OTHER_GROUP,
  ]

  it("a project's own chats, and no other project's or group's", () => {
    expect(all.filter((c) => isChatInScopePool(c, projectScope))).toEqual([
      PROJECT,
      TOPIC,
      STORY,
      FEATURE,
      REQUEST,
      RUN_CHAT,
    ])
  })

  it("a group's own chats and its projects' chats, and no other group's or project's", () => {
    expect(all.filter((c) => isChatInScopePool(c, groupScope))).toEqual([
      PROJECT,
      TOPIC,
      STORY,
      FEATURE,
      REQUEST,
      GROUP,
      GROUP_TOPIC,
      RUN_CHAT,
    ])
  })

  it('never leaves out a chat the pool would list', () => {
    const busy = { ...QUIET, needsYou: 1 }
    for (const scope of [projectScope, groupScope]) {
      for (const archived of [false, true]) {
        const rows = all.map((chat) => row({ chat: { context: chat }, status: busy }))
        for (const pooled of chatListPool(rows, scope, archived))
          expect(isChatInScopePool(pooled.context, scope)).toBe(true)
      }
    }
  })
})

describe('the chat list — closed chats, from the chats as stored', () => {
  const CLOSED_AT = '2026-10-20T14:00:00Z'
  const project: ChatListScope = { kind: 'project', projectId: 'p1' }
  const REQUEST_2: ChatContext = {
    type: 'FEATURE_REQUEST',
    projectId: 'p1',
    featureRequestId: 'r2',
  }
  const handedOverRequest: ChatListChat = {
    context: REQUEST,
    title: 'Incoming request',
    archivedAt: CLOSED_AT,
    messageTimes: ['2026-10-15T09:00:00Z', '2026-10-15T12:00:00Z'],
    needsYouTimes: ['2026-10-15T12:00:00Z'],
  }
  const hiddenTopic: ChatListChat = {
    context: TOPIC,
    listHiddenAt: '2026-10-18T00:00:00Z',
    messageTimes: ['2026-10-17T10:00:00Z'],
  }
  const closedWithAsk: ChatListChat = {
    context: REQUEST_2,
    archivedAt: CLOSED_AT,
    messageTimes: ['2026-10-19T10:00:00Z'],
  }
  const liveStory: ChatListChat = {
    context: STORY,
    messageTimes: ['2026-10-21T10:00:00Z'],
    needsYouTimes: ['2026-10-21T10:00:00Z'],
  }
  const finishedRun: ChatListChat = {
    context: RUN_CHAT,
    archivedAt: CLOSED_AT,
    messageTimes: ['2026-10-19T10:00:00Z'],
  }
  const ASKS = new Map([[getChatContextKey(REQUEST_2), 1]])

  const rowsOf = (chats: ChatListChat[], asks: ReadonlyMap<string, number> = ASKS) =>
    chats.map((chat) => {
      const key = getChatContextKey(chat.context)
      return chatListRow({
        chat,
        status: computeChatRowStatus({
          context: chat.context,
          contextKey: key,
          chat,
          isSending: false,
          seen: {},
          pendingAsks: asks.get(key) ?? 0,
        }),
        now: NOW,
        ...(chat.context === RUN_CHAT ? { run: run({ status: 'succeeded' }) } : {}),
      })
    })
  const rows = rowsOf([handedOverRequest, hiddenTopic, closedWithAsk, liveStory, finishedRun])
  const keysOf = (archived: boolean, filter: ChatListFilter = 'all') =>
    chatListSections({ rows, scope: project, filter, archived }).flatMap((s) =>
      s.rows.map((r) => r.context),
    )

  it('leaves a handed-over request and a finished run’s chat out of the list', () => {
    expect(keysOf(false)).toEqual([STORY, REQUEST_2])
    expect(keysOf(false, 'runs')).toEqual([])
  })

  it('keeps a closed chat an ask waits in, under Needs you, until it is answered', () => {
    expect(keysOf(false, 'needs-you')).toEqual([STORY, REQUEST_2])
    const settled = rowsOf([closedWithAsk], new Map())
    expect(chatListPool(settled, project, false)).toEqual([])
    expect(chatListPool(settled, project, true).map((r) => r.context)).toEqual([REQUEST_2])
  })

  it('shows the closed and the hidden together in the archived view, quiet', () => {
    const archived = chatListSections({ rows, scope: project, filter: 'all', archived: true })
    expect(archived.flatMap((s) => s.rows.map((r) => r.context))).toEqual([
      RUN_CHAT,
      TOPIC,
      REQUEST,
    ])
    expect(archived[0]?.rows.every((r) => r.needsYou === 0 && !r.running && !r.fresh)).toBe(true)
  })

  it('lists a closed chat the person put back, quiet, until they archive it again', () => {
    const putBack = rowsOf([{ ...handedOverRequest, listShownAt: '2026-10-21T08:00:00Z' }])
    expect(chatListPool(putBack, project, false).map((r) => r.context)).toEqual([REQUEST])
    expect(putBack[0]).toMatchObject({ needsYou: 0, fresh: false, retired: false })
    const archivedAgain = rowsOf([{ ...handedOverRequest, listHiddenAt: '2026-10-21T09:00:00Z' }])
    expect(chatListPool(archivedAgain, project, true).map((r) => r.context)).toEqual([REQUEST])
  })

  it('counts on its chips only what the list shows', () => {
    expect(chatListFilterCounts(chatListPool(rows, project, false))).toEqual({
      all: 2,
      'needs-you': 2,
      running: 0,
      runs: 0,
      stories: 1,
    })
    expect(chatListPool(rows, project, true)).toHaveLength(3)
  })
})
