import { describe, expect, it } from 'vitest'
import type { ChatContext, ProcessLedgerEntry, ProcessRun } from 'thefactory-tools/types'
import { emptyProcessTimeBreakdown, processRunChatContext } from 'thefactory-tools/utils'

import { chatHeaderView, chatKindOf, chatMessagesCost } from './chatHeader'
import { CHAT_KIND_VIEW } from './chatHeaderConstants'
import type { ChatHeaderInput } from './chatHeaderTypes'
import { processRunBadge } from './processView'
import { statusLabel } from './status'

function run(over: Partial<ProcessRun> = {}): ProcessRun {
  return {
    id: 'run-1',
    projectId: 'p',
    storyId: 's7',
    title: 'Project- and group-defined agent types',
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
  }
}

const runChat: ChatContext = processRunChatContext({ id: 'run-1', projectId: 'p' })
const index = (id: string) => (id === 's7' ? 7 : undefined)
const featureIndex = (_s: string, f: string) => (f === 'f2' ? 2 : undefined)

const feature = (
  id: string,
  status: 'pending' | 'in_progress' | 'reviewable' | 'done',
  acceptance?: string,
) => ({
  id,
  title: `Feature ${id}`,
  status,
  ...(acceptance !== undefined ? { acceptance } : {}),
})

function input(over: Partial<ChatHeaderInput>): ChatHeaderInput {
  return { context: { type: 'PROJECT', projectId: 'p' }, now: 0, ...over }
}

describe('chatKindOf', () => {
  it('reads every context type as its kind', () => {
    const cases: Array<[ChatContext, string]> = [
      [{ type: 'PROJECT', projectId: 'p' }, 'project'],
      [{ type: 'PROJECT_TOPIC', projectId: 'p', topicId: 'ideas' }, 'topic'],
      [runChat, 'run'],
      [{ type: 'STORY', projectId: 'p', storyId: 's' }, 'story'],
      [{ type: 'FEATURE', projectId: 'p', storyId: 's', featureId: 'f' }, 'feature'],
      [{ type: 'AGENT_RUN_STORY', projectId: 'p', storyId: 's', agentRunId: 'a' }, 'run'],
      [
        {
          type: 'AGENT_RUN_FEATURE',
          projectId: 'p',
          storyId: 's',
          featureId: 'f',
          agentRunId: 'a',
        },
        'run',
      ],
      [{ type: 'FEATURE_REQUEST', projectId: 'p', featureRequestId: 'r' }, 'request'],
      [{ type: 'GROUP', groupId: 'g' }, 'group'],
      [{ type: 'GROUP_TOPIC', groupId: 'g', topicId: 't' }, 'group'],
      [{ type: 'GENERAL', timestamp: 't' }, 'assistant'],
    ]
    for (const [context, kind] of cases) expect(chatKindOf(context), context.type).toBe(kind)
  })
})

describe('chatMessagesCost', () => {
  it('sums every message that measured usage and skips the rest', () => {
    const cost = chatMessagesCost([
      { usage: { cost: 1.25, promptTokens: 10, completionTokens: 5 }, model: 'm' },
      {},
      { usage: { cost: 0.5, promptTokens: 4, completionTokens: 2 }, model: 'm' },
    ])
    expect(cost?.costUsd).toBeCloseTo(1.75)
  })

  it('is undefined when nothing was measured', () => {
    expect(chatMessagesCost([])).toBeUndefined()
    expect(chatMessagesCost([{}, {}])).toBeUndefined()
  })
})

describe('chatHeaderView — a process run chat', () => {
  it('titles the chat by the run, pills its badge and lists its steps', () => {
    const r = run()
    const view = chatHeaderView(input({ context: runChat, run: r, storyDisplayIndex: index }))
    expect(view.kind).toBe('run')
    expect(view.kindLabel).toBe(CHAT_KIND_VIEW.run.label)
    expect(view.title).toBe('Project- and group-defined agent types')
    expect(view.pill).toEqual(processRunBadge(r, 0))
    expect(view.context).toBe('Story #7 · Implement')
    expect(view.strip?.label).toBe('Steps')
    expect(view.strip?.entries.map((e) => [e.label, e.phase])).toEqual([
      ['Implement', 'current'],
      ['Sign-off', 'upcoming'],
    ])
  })

  it('shows the run’s working time and spend, not the chat’s messages', () => {
    const r = run({
      totals: {
        workMs: 5 * 60_000,
        time: emptyProcessTimeBreakdown(),
        ticking: true,
        at: 1_000,
        steps: {},
        costUsd: 4.75,
      },
      budget: { spendUsdCap: 100 },
    })
    const view = chatHeaderView(
      input({ context: runChat, run: r, now: 61_000, messagesCost: { costUsd: 9 } }),
    )
    expect(view.duration?.label).toBe('6m 00s')
    expect(view.cost?.label).toBe('$4.75 of $100.00')
    expect(view.cost?.cost).toBe(r.totals)
  })

  it('falls back to the stored title and the project before the run is read', () => {
    const view = chatHeaderView(
      input({ context: runChat, chatTitle: 'Run: agent types', projectName: 'Tools' }),
    )
    expect(view.title).toBe('Run: agent types')
    expect(view.context).toBe('Tools')
    expect(view.pill).toBeUndefined()
    expect(view.strip).toBeUndefined()
    expect(view.duration).toBeUndefined()
  })

  it('shows no cost when the run has measured none, whatever the chat’s messages cost', () => {
    const view = chatHeaderView(
      input({ context: runChat, run: run(), messagesCost: { costUsd: 2 } }),
    )
    expect(view.cost).toBeUndefined()
  })

  it('names the process when the run has no story', () => {
    const view = chatHeaderView(input({ context: runChat, run: run({ storyId: undefined }) }))
    expect(view.context).toBe('Story delivery · Implement')
  })
})

describe('chatHeaderView — an agent run chat', () => {
  it('reads as an agent run with its story, costed by its messages', () => {
    const view = chatHeaderView(
      input({
        context: { type: 'AGENT_RUN_STORY', projectId: 'p', storyId: 's7', agentRunId: 'a' },
        storyDisplayIndex: index,
        messagesCost: { costUsd: 0.4 },
      }),
    )
    expect(view.kind).toBe('run')
    expect(view.kindLabel).toBe('Agent run')
    expect(view.title).toBe('Agent Run · Story #7')
    expect(view.context).toBe('Story #7')
    expect(view.cost?.label).toBe('$0.40')
    expect(view.duration).toBeUndefined()
  })
})

describe('chatHeaderView — an agent run chat given a process run', () => {
  it('still reads the agent run, never the process run', () => {
    const view = chatHeaderView(
      input({
        context: { type: 'AGENT_RUN_STORY', projectId: 'p', storyId: 's7', agentRunId: 'a' },
        run: run({
          totals: {
            workMs: 60_000,
            time: emptyProcessTimeBreakdown(),
            ticking: false,
            at: 0,
            steps: {},
            costUsd: 3,
          },
        }),
        messagesCost: { costUsd: 0.4 },
      }),
    )
    expect(view.duration).toBeUndefined()
    expect(view.cost?.label).toBe('$0.40')
  })
})

describe('chatHeaderView — a story chat', () => {
  it('titles it by reference and title, pills its status and lists its features', () => {
    const story = {
      id: 's7',
      title: 'Agent-to-agent chat messaging',
      status: 'in_progress' as const,
      features: [feature('f1', 'done'), feature('f2', 'in_progress'), feature('f3', 'pending')],
    }
    const view = chatHeaderView(
      input({
        context: { type: 'STORY', projectId: 'p', storyId: 's7' },
        story,
        storyDisplayIndex: index,
        featureDisplayIndex: featureIndex,
      }),
    )
    expect(view.title).toBe('Story #7 · Agent-to-agent chat messaging')
    expect(view.pill).toEqual({ label: statusLabel('in_progress'), tone: 'working' })
    expect(view.context).toBe('1 of 3 features done')
    expect(view.strip?.label).toBe('Features')
    expect(view.strip?.entries.map((e) => e.label)).toEqual([
      '#7.f1 Feature f1',
      '#7.2 Feature f2',
      '#7.f3 Feature f3',
    ])
  })

  it('says “feature” for a story of one and shows the project for a story of none', () => {
    const base = {
      context: { type: 'STORY', projectId: 'p', storyId: 's7' } as ChatContext,
      projectName: 'Tools',
    }
    const one = { id: 's7', title: 'T', status: 'done' as const, features: [feature('f1', 'done')] }
    expect(chatHeaderView(input({ ...base, story: one })).context).toBe('1 of 1 feature done')
    const none = { ...one, features: [] }
    const view = chatHeaderView(input({ ...base, story: none }))
    expect(view.context).toBe('Tools')
    expect(view.strip).toBeUndefined()
  })

  it('keeps the plain title while the story is not read', () => {
    const view = chatHeaderView(
      input({
        context: { type: 'STORY', projectId: 'p', storyId: 's7' },
        storyDisplayIndex: index,
      }),
    )
    expect(view.title).toBe('Story #7')
    expect(view.pill).toBeUndefined()
  })
})

describe('chatHeaderView — a feature chat', () => {
  const context: ChatContext = { type: 'FEATURE', projectId: 'p', storyId: 's7', featureId: 'f2' }

  it('lists the feature’s done-when criteria under its story', () => {
    const view = chatHeaderView(
      input({
        context,
        feature: feature('f2', 'in_progress', '- Card shows sender\n- Deny keeps it unsent'),
        story: { id: 's7', title: 'Messaging', status: 'in_progress', features: [] },
        storyDisplayIndex: index,
        featureDisplayIndex: featureIndex,
      }),
    )
    expect(view.title).toBe('Feature #7.2 · Feature f2')
    expect(view.context).toBe('Story #7 · Messaging')
    expect(view.strip).toMatchObject({ label: 'Done when' })
    expect(view.strip?.entries.map((e) => e.label)).toEqual([
      'Card shows sender',
      'Deny keeps it unsent',
    ])
  })

  it('has no strip when the feature states no criteria', () => {
    const view = chatHeaderView(input({ context, feature: feature('f2', 'pending') }))
    expect(view.strip).toBeUndefined()
    expect(view.context).toBe('Story #s7')
  })
})

describe('chatHeaderView — the other chats', () => {
  it('reads a project chat by its project', () => {
    const view = chatHeaderView(input({ projectName: 'TheFactory Tools' }))
    expect(view).toMatchObject({
      kind: 'project',
      title: 'TheFactory Tools Chat',
      context: 'TheFactory Tools',
    })
    expect(view.cost).toBeUndefined()
  })

  it('costs a chat by its messages', () => {
    const view = chatHeaderView(input({ messagesCost: { costUsd: 2.31 } }))
    expect(view.cost).toMatchObject({ label: '$2.31', cost: { costUsd: 2.31 } })
  })

  it('reads a group chat by how many projects it holds', () => {
    const many = chatHeaderView(
      input({
        context: { type: 'GROUP', groupId: 'g' },
        groupName: 'TheFactory',
        groupProjectCount: 9,
      }),
    )
    expect(many).toMatchObject({
      kind: 'group',
      title: 'TheFactory Chat',
      context: 'Group · 9 projects',
    })
    const one = chatHeaderView(
      input({ context: { type: 'GROUP', groupId: 'g' }, groupProjectCount: 1 }),
    )
    expect(one.context).toBe('Group · 1 project')
    const unknown = chatHeaderView(input({ context: { type: 'GROUP', groupId: 'g' } }))
    expect(unknown.context).toBe('Group chat')
  })

  it('reads a group topic under its group', () => {
    const view = chatHeaderView(
      input({
        context: { type: 'GROUP_TOPIC', groupId: 'g', topicId: 't' },
        chatTitle: 'Release train',
        groupName: 'TheFactory',
      }),
    )
    expect(view).toMatchObject({ title: 'Release train', context: 'TheFactory' })
  })

  it('reads an incoming request by its stored title', () => {
    const context: ChatContext = { type: 'FEATURE_REQUEST', projectId: 'p', featureRequestId: 'r' }
    expect(chatHeaderView(input({ context, chatTitle: 'Shared approval card' })).title).toBe(
      'Shared approval card',
    )
    expect(chatHeaderView(input({ context })).title).toBe('Incoming request')
  })

  it('reads the assistant as across everything', () => {
    const view = chatHeaderView(input({ context: { type: 'GENERAL', timestamp: 't' } }))
    expect(view).toMatchObject({ kind: 'assistant', context: 'Across everything' })
  })

  it('marks an Assistant conversation archived from the list', () => {
    const context: ChatContext = { type: 'GENERAL', timestamp: 't' }
    expect(chatHeaderView(input({ context, listHidden: true })).pill).toEqual({
      label: 'Archived',
      tone: 'empty',
    })
    expect(chatHeaderView(input({ context })).pill).toBeUndefined()
  })

  it('gives no archived pill to other chats, whose list carries that', () => {
    const context: ChatContext = { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 't' }
    expect(chatHeaderView(input({ context, listHidden: true })).pill).toBeUndefined()
  })
})
