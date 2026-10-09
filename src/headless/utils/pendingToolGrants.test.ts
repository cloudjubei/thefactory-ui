import { MCP_TOOL_CALL_ACTION_KIND } from 'thefactory-tools/constants'
import { describe, it, expect } from 'vitest'
import {
  cliDecideOutcome,
  cliPendingActionToGrant,
  formatActionLabel,
  grantDecideErrorMessage,
  isCliActionUpdateEvent,
  isCliRunLifecycleEvent,
  chatTurnActivity,
  isToolGrantAction,
  pendingActionToolName,
  pickActiveCliRunId,
  pickActiveStoryRunId,
  cliDecidedAsks,
  withDecidedAction,
  withAsksAwaitingOutcome,
  cliRowAsks,
  isAskOutcomeEvent,
} from './pendingToolGrants'
import type { ChatContextAgentRunStory } from '../api/generated'

describe('pendingActionToolName', () => {
  it('reads the tool out of a gated executable tool payload', () => {
    expect(
      pendingActionToolName({
        id: 'a-1',
        kind: 'inspect-host-path',
        payload: { tool: 'inspectProjectPath', args: {} },
      }),
    ).toBe('inspectProjectPath')
  })

  it('names no tool when the payload carries none', () => {
    expect(
      pendingActionToolName({ id: 'a-2', kind: 'network-unlock', payload: { host: 'x' } }),
    ).toBeUndefined()
  })

  it('rejects a non-string tool field', () => {
    expect(pendingActionToolName({ id: 'a-3', kind: 'tool', payload: { tool: 7 } })).toBeUndefined()
  })

  it('rejects an empty tool name', () => {
    expect(
      pendingActionToolName({ id: 'a-4', kind: 'tool', payload: { tool: '' } }),
    ).toBeUndefined()
  })

  it('survives a non-object payload', () => {
    expect(pendingActionToolName({ id: 'a-5', kind: 'tool', payload: 'nope' })).toBeUndefined()
  })

  it('survives a null payload', () => {
    expect(pendingActionToolName({ id: 'a-6', kind: 'tool', payload: null })).toBeUndefined()
  })
})

describe('cliPendingActionToGrant — ordinary tool asks are decided on their row', () => {
  it("marks an ordinary tool ask inline and carries the call's arguments", () => {
    expect(
      cliPendingActionToGrant({
        id: 'a-9',
        kind: 'tool-call',
        payload: { tool: 'addStory', args: { title: 'T' } },
      }),
    ).toMatchObject({ inline: true, toolName: 'addStory', args: { title: 'T' } })
  })

  it('leaves a request of its own kind for the approval panel', () => {
    const grant = cliPendingActionToGrant({
      id: 'a-8',
      kind: 'start-feature-work',
      payload: { tool: 'startFeatureWork', args: { storyId: 's' } },
    })
    expect(grant.inline).toBeUndefined()
  })
})

describe('cliRowAsks', () => {
  it('lists every ask a row can be tied to — an API turn’s as a CLI run’s — saying which are decided on the row', () => {
    const grants = [
      {
        id: 'a',
        chatRunner: 'cli' as const,
        label: 'addStory',
        toolName: 'addStory',
        inline: true,
        args: { t: 1 },
      },
      { id: 'b', chatRunner: 'cli' as const, label: 'Network unlock' },
      {
        id: 'c',
        chatRunner: 'api' as const,
        label: 'writeFile',
        toolName: 'writeFile',
        inline: true,
      },
    ]
    expect(cliRowAsks(grants)).toEqual([
      { id: 'a', toolName: 'addStory', args: { t: 1 }, decidedOnRow: true },
      { id: 'b', decidedOnRow: false },
      { id: 'c', toolName: 'writeFile', decidedOnRow: true },
    ])
  })
})

describe('cliPendingActionToGrant', () => {
  it('decides an ordinary tool ask on its row', () => {
    const grant = cliPendingActionToGrant({
      id: 'a-1',
      kind: MCP_TOOL_CALL_ACTION_KIND,
      payload: { tool: 'addStory', args: {} },
    })
    expect(grant.inline).toBe(true)
  })

  it('keeps a feature-work launch for its own panel, though it is gated as a tool call', () => {
    const grant = cliPendingActionToGrant({
      id: 'a-1',
      kind: MCP_TOOL_CALL_ACTION_KIND,
      payload: { tool: 'startFeatureWork', args: { storyId: 's' } },
    })
    expect(grant.inline).toBeUndefined()
  })

  it('maps a CLI run’s PendingAction to a grant with a humanised label', () => {
    expect(
      cliPendingActionToGrant({ id: 'a-1', kind: 'network-unlock', payload: { host: 'x' } }),
    ).toEqual({
      id: 'a-1',
      chatRunner: 'cli',
      label: 'Network unlock',
      detail: { host: 'x' },
      alwaysAllowScopes: ['everywhere'],
      grantCovers: 'exact-call',
    })
  })

  it('maps an API chat turn’s ask exactly as a CLI run’s, saying the chat runs on the API', () => {
    const action = {
      id: 'a-3',
      kind: MCP_TOOL_CALL_ACTION_KIND,
      payload: { tool: 'addStory', args: { title: 'T' } },
      grantPayload: { tool: 'addStory' },
      chatContextId: '/projects/p',
    }
    const api = cliPendingActionToGrant({ ...action, runId: 'api-chat-turn:t1' })
    const cli = cliPendingActionToGrant({ ...action, runId: 'run-1' })
    expect(api.chatRunner).toBe('api')
    expect(cli.chatRunner).toBe('cli')
    expect({ ...api, chatRunner: 'cli' }).toEqual(cli)
    expect(api).toMatchObject({
      inline: true,
      alwaysAllowScopes: ['chat', 'everywhere'],
      grantCovers: 'tool',
      detail: { tool: 'addStory', args: { title: 'T' } },
    })
  })

  it('attaches the parsed question for an askUser action', () => {
    expect(
      cliPendingActionToGrant({
        id: 'a-2',
        kind: 'question',
        payload: { question: 'Which env?', options: ['dev', 'prod'] },
      }),
    ).toEqual({
      id: 'a-2',
      chatRunner: 'cli',
      label: 'Question',
      detail: { question: 'Which env?', options: ['dev', 'prod'] },
      question: { question: 'Which env?', options: ['dev', 'prod'] },
      alwaysAllowScopes: ['everywhere'],
      grantCovers: 'exact-call',
    })
  })

  it('leaves question unset for a permission action', () => {
    expect('question' in cliPendingActionToGrant({ id: 'a-3', kind: 'network-unlock' })).toBe(false)
  })

  it('labels from the tool the action names rather than its grant kind', () => {
    const grant = cliPendingActionToGrant({
      id: 'a-4',
      kind: 'inspect-host-path',
      payload: { tool: 'inspectProjectPath', args: { path: '/repo' } },
    })
    expect(grant.label).toBe('inspectProjectPath')
    expect(grant.toolName).toBe('inspectProjectPath')
  })

  it('leaves toolName unset when the action names no tool', () => {
    expect('toolName' in cliPendingActionToGrant({ id: 'a-5', kind: 'network-unlock' })).toBe(false)
  })
})

describe('isToolGrantAction', () => {
  it('treats gated tool / cap-raise / network-unlock as approvable grants', () => {
    expect(isToolGrantAction({ id: 'a', kind: 'network-unlock' })).toBe(true)
    expect(isToolGrantAction({ id: 'b', kind: 'workspace-limit-raise' })).toBe(true)
    expect(isToolGrantAction({ id: 'c', kind: 'tool' })).toBe(true)
  })

  it('treats auth-expired as a notification, not an approvable grant', () => {
    expect(isToolGrantAction({ id: 'd', kind: 'auth-expired' })).toBe(false)
  })
})

describe('formatActionLabel', () => {
  it('capitalises the first word and splits on - / _ / space', () => {
    expect(formatActionLabel('network-unlock')).toBe('Network unlock')
    expect(formatActionLabel('workspace-limit-raise')).toBe('Workspace limit raise')
    expect(formatActionLabel('install_package')).toBe('Install package')
  })

  it('returns the raw kind when it has no separable words', () => {
    expect(formatActionLabel('')).toBe('')
  })
})

describe('isCliActionUpdateEvent', () => {
  it('fires for the two payload types that change a run’s pending actions', () => {
    expect(isCliActionUpdateEvent({ runId: 'r1', type: 'actionRequest' })).toBe(true)
    expect(isCliActionUpdateEvent({ runId: 'r1', type: 'actionDecided' })).toBe(true)
  })

  it('ignores the chatty transcript stream and unrelated payloads', () => {
    expect(isCliActionUpdateEvent({ runId: 'r1', type: 'transcriptAppend' })).toBe(false)
    expect(isCliActionUpdateEvent({ runId: 'r1', type: 'artifactAdded' })).toBe(false)
    expect(isCliActionUpdateEvent({ runId: 'r1' })).toBe(false)
    expect(isCliActionUpdateEvent({ type: 42 })).toBe(false)
    expect(isCliActionUpdateEvent(null)).toBe(false)
    expect(isCliActionUpdateEvent(undefined)).toBe(false)
    expect(isCliActionUpdateEvent('actionRequest')).toBe(false)
  })
})

describe('chatTurnActivity', () => {
  it('reads whether the server started or stopped a turn of this chat', () => {
    expect(chatTurnActivity({ chatContextId: '/projects/p1', active: true }, '/projects/p1')).toBe(
      true,
    )
    expect(chatTurnActivity({ chatContextId: '/projects/p1', active: false }, '/projects/p1')).toBe(
      false,
    )
  })

  it('ignores another chat’s turn and anything malformed', () => {
    expect(
      chatTurnActivity({ chatContextId: '/projects/p2', active: true }, '/projects/p1'),
    ).toBeUndefined()
    expect(chatTurnActivity({ chatContextId: '/projects/p1' }, '/projects/p1')).toBeUndefined()
    expect(chatTurnActivity(null, '/projects/p1')).toBeUndefined()
  })
})

describe('isCliRunLifecycleEvent', () => {
  it('fires for the payload types that can change which run a chat has active', () => {
    for (const type of ['started', 'statusChanged', 'finished', 'error', 'actionRequest']) {
      expect(isCliRunLifecycleEvent({ runId: 'r1', type })).toBe(true)
    }
  })

  it('ignores the chatty transcript stream and unrelated payloads', () => {
    expect(isCliRunLifecycleEvent({ runId: 'r1', type: 'transcriptAppend' })).toBe(false)
    expect(isCliRunLifecycleEvent({ runId: 'r1', type: 'actionDecided' })).toBe(false)
    expect(isCliRunLifecycleEvent({ runId: 'r1', type: 'policyChanged' })).toBe(false)
    expect(isCliRunLifecycleEvent(null)).toBe(false)
  })
})

describe('pickActiveStoryRunId', () => {
  const storyChat: ChatContextAgentRunStory = {
    type: 'AGENT_RUN_STORY',
    projectId: 'p',
    storyId: 's1',
    agentRunId: 'verifier',
  }
  const storyChatKey = '/projects/p/stories/s1/agents/verifier'

  it("ignores another agent's story-level run in the same story", () => {
    // The regression: a finished verifier's Transcript showed the REPORT agent
    // running next in the same story, because any active run in the story won.
    const runs = [
      {
        id: 'report-run',
        chatContextId: '/projects/p/stories/s1/agents/report',
        storyId: 's1',
        createdAt: 50,
      },
    ]
    expect(pickActiveStoryRunId(runs, storyChat)).toBeUndefined()
  })

  it("picks this chat's own run", () => {
    const runs = [
      { id: 'report-run', chatContextId: '/projects/p/stories/s1/agents/report', createdAt: 50 },
      { id: 'own-run', chatContextId: storyChatKey, storyId: 's1', createdAt: 10 },
    ]
    expect(pickActiveStoryRunId(runs, storyChat)).toBe('own-run')
  })

  it('picks a feature sub-run spawned by this agent run', () => {
    const runs = [
      {
        id: 'feature-run',
        chatContextId: '/projects/p/stories/s1/features/f1/agents/verifier',
        storyId: 's1',
        createdAt: 5,
      },
    ]
    expect(pickActiveStoryRunId(runs, storyChat)).toBe('feature-run')
  })

  it('ignores a feature sub-run belonging to a different agent run', () => {
    const runs = [
      {
        id: 'foreign-feature',
        chatContextId: '/projects/p/stories/s1/features/f1/agents/report',
        storyId: 's1',
        createdAt: 5,
      },
    ]
    expect(pickActiveStoryRunId(runs, storyChat)).toBeUndefined()
  })

  it('ignores a same-named agent run under another story or project', () => {
    const runs = [
      { id: 'other-story', chatContextId: '/projects/p/stories/s2/features/f1/agents/verifier' },
      { id: 'other-project', chatContextId: '/projects/q/stories/s1/features/f1/agents/verifier' },
      { id: 'other-story-own', chatContextId: '/projects/p/stories/s2/agents/verifier' },
    ]
    expect(pickActiveStoryRunId(runs, storyChat)).toBeUndefined()
  })

  it('ignores a run with no chat binding or an unparseable one', () => {
    const runs = [
      { id: 'unbound', storyId: 's1', createdAt: 9 },
      { id: 'garbage', chatContextId: 'not/a/chat/key', storyId: 's1', createdAt: 8 },
    ]
    expect(pickActiveStoryRunId(runs, storyChat)).toBeUndefined()
  })

  it('prefers the newest of several runs that belong to this chat', () => {
    const runs = [
      {
        id: 'feature-1',
        chatContextId: '/projects/p/stories/s1/features/f1/agents/verifier',
        createdAt: 10,
      },
      {
        id: 'foreign-newest',
        chatContextId: '/projects/p/stories/s1/agents/report',
        createdAt: 99,
      },
      {
        id: 'feature-2',
        chatContextId: '/projects/p/stories/s1/features/f2/agents/verifier',
        createdAt: 30,
      },
      { id: 'own', chatContextId: storyChatKey, createdAt: 20 },
    ]
    expect(pickActiveStoryRunId(runs, storyChat)).toBe('feature-2')
  })

  it('returns undefined when there are no runs', () => {
    expect(pickActiveStoryRunId(undefined, storyChat)).toBeUndefined()
    expect(pickActiveStoryRunId([], storyChat)).toBeUndefined()
  })
})

describe('pickActiveCliRunId', () => {
  it('returns the run bound to this chat', () => {
    expect(
      pickActiveCliRunId(
        [{ id: 'run-1', chatContextId: 'projects/p/GENERAL', createdAt: 1 }],
        'projects/p/GENERAL',
      ),
    ).toBe('run-1')
  })

  it('prefers the most recently created run when a chat has several active', () => {
    const runs = [
      { id: 'old', chatContextId: 'k', createdAt: 10 },
      { id: 'new', chatContextId: 'k', createdAt: 30 },
      { id: 'mid', chatContextId: 'k', createdAt: 20 },
    ]
    expect(pickActiveCliRunId(runs, 'k')).toBe('new')
  })

  it('breaks a createdAt tie towards the later entry, matching the server’s stable sort', () => {
    const runs = [
      { id: 'first', chatContextId: 'k', createdAt: 5 },
      { id: 'second', chatContextId: 'k', createdAt: 5 },
    ]
    expect(pickActiveCliRunId(runs, 'k')).toBe('second')
  })

  it('never returns a run belonging to another chat', () => {
    const runs = [
      { id: 'other', chatContextId: 'other-chat', createdAt: 99 },
      { id: 'unbound', createdAt: 98 },
      { id: 'mine', chatContextId: 'k', createdAt: 1 },
    ]
    expect(pickActiveCliRunId(runs, 'k')).toBe('mine')
    expect(pickActiveCliRunId([runs[0], runs[1]], 'k')).toBeUndefined()
  })

  it('returns undefined for an empty, missing, or unusable list', () => {
    expect(pickActiveCliRunId([], 'k')).toBeUndefined()
    expect(pickActiveCliRunId(undefined, 'k')).toBeUndefined()
    expect(pickActiveCliRunId([{ id: '', chatContextId: 'k' }], 'k')).toBeUndefined()
  })

  it('returns undefined when the chat key is empty, so no run can match by accident', () => {
    expect(pickActiveCliRunId([{ id: 'run-1', chatContextId: '' }], '')).toBeUndefined()
  })
})

describe('cliDecideOutcome', () => {
  it('routes a one-off approval to approved', () => {
    expect(cliDecideOutcome('once')).toBe('approved')
  })

  it('routes an always-allow in this chat to approved-permanent', () => {
    expect(cliDecideOutcome('always-in-chat')).toBe('approved-permanent')
  })

  it('routes an always-allow everywhere to approved-permanent', () => {
    expect(cliDecideOutcome('always-everywhere')).toBe('approved-permanent')
  })

  it('routes a refusal to denied', () => {
    expect(cliDecideOutcome('deny')).toBe('denied')
  })
})

describe('cliPendingActionToGrant always-allow offer', () => {
  it('offers this chat first, then everywhere, for an ask raised in a chat', () => {
    const grant = cliPendingActionToGrant({
      id: 'a',
      kind: 'tool-call',
      payload: { tool: 'addFeature', args: {} },
      chatContextId: 'c1',
    })
    expect(grant.alwaysAllowScopes).toEqual(['chat', 'everywhere'])
    expect(grant.chatContextId).toBe('c1')
  })

  it('offers only everywhere for an ask raised outside any chat', () => {
    const grant = cliPendingActionToGrant({ id: 'a', kind: 'network-unlock', payload: {} })
    expect(grant.alwaysAllowScopes).toEqual(['everywhere'])
  })

  it('withholds it when the server refuses standing grants', () => {
    const grant = cliPendingActionToGrant({
      id: 'a',
      kind: 'inspect-host-path',
      payload: { path: '/x' },
      noPermanentGrant: true,
      chatContextId: 'c1',
    })
    expect(grant.alwaysAllowScopes).toEqual([])
  })

  it('treats an explicit false the same as absent — the offer stands', () => {
    const grant = cliPendingActionToGrant({
      id: 'a',
      kind: 'network-unlock',
      payload: {},
      noPermanentGrant: false,
    })
    expect(grant.alwaysAllowScopes).toEqual(['everywhere'])
  })

  it('says a grant given by tool name covers the whole tool', () => {
    const grant = cliPendingActionToGrant({
      id: 'a',
      kind: 'tool-call',
      payload: { tool: 'addFeature', args: { title: 'A' } },
      grantPayload: { tool: 'addFeature' },
    })
    expect(grant.grantCovers).toBe('tool')
  })

  it('says a grant over the full payload covers that exact call', () => {
    const grant = cliPendingActionToGrant({
      id: 'a',
      kind: 'tool-call',
      payload: { tool: 'readFile', args: { path: 'x' } },
    })
    expect(grant.grantCovers).toBe('exact-call')
  })
})

describe('grantDecideErrorMessage', () => {
  it('prefers the route refusal body ({ error }) — the 409 for an already-terminal action', () => {
    expect(
      grantDecideErrorMessage({
        error: 'This approval expired before it was decided — ask the agent to raise it again.',
      }),
    ).toMatch(/expired/)
  })

  it('falls back to Error.message, a raw string, then a generic explanation', () => {
    expect(grantDecideErrorMessage(new Error('boom'))).toBe('boom')
    expect(grantDecideErrorMessage('plain refusal')).toBe('plain refusal')
    expect(grantDecideErrorMessage(undefined)).toMatch(/could not be applied/)
    expect(grantDecideErrorMessage({})).toMatch(/could not be applied/)
  })
})

describe('cliDecidedAsks', () => {
  const action = {
    id: 'a1',
    runId: 'run-1',
    kind: 'tool-call',
    payload: { tool: 'addStory', args: { title: 'T' } },
  }

  it('turns decided actions into the asks their rows show', () => {
    expect(
      cliDecidedAsks([
        {
          ...action,
          status: 'approved',
          executedAt: 9,
          executedInRun: 'run-2',
          execution: { ok: true, result: '{}' },
        },
      ]),
    ).toEqual([
      {
        id: 'a1',
        runId: 'run-1',
        status: 'approved',
        toolName: 'addStory',
        args: { title: 'T' },
        executedAt: 9,
        executedInRun: 'run-2',
        execution: { ok: true, result: '{}' },
      },
    ])
  })

  it('keeps who decided it and where', () => {
    const [ask] = cliDecidedAsks([
      { ...action, status: 'approved', decidedBy: 'person', decidedVia: 'approve-all' },
    ])
    expect(ask).toMatchObject({ decidedBy: 'person', decidedVia: 'approve-all' })
    expect(ask?.rule).toBeUndefined()
  })

  it('names the rule a standing grant for the whole tool applied', () => {
    const [ask] = cliDecidedAsks([
      {
        ...action,
        status: 'approved',
        toolName: 'addFeature',
        grantPayload: { tool: 'addFeature' },
        decidedBy: 'grant:g1',
        decidedVia: 'grant',
        grantScope: { kind: 'chat', chatContextId: 'c1' },
      },
    ])
    expect(ask?.rule).toBe('always allow addFeature in this chat')
  })

  it('names a rule that applies everywhere', () => {
    const [ask] = cliDecidedAsks([
      {
        ...action,
        status: 'approved',
        toolName: 'addFeature',
        grantPayload: { tool: 'addFeature' },
        decidedBy: 'grant:g1',
        decidedVia: 'grant',
        grantScope: { kind: 'everywhere' },
      },
    ])
    expect(ask?.rule).toBe('always allow addFeature everywhere')
  })

  it('names the rule a standing grant for one exact call applied', () => {
    const [ask] = cliDecidedAsks([
      { ...action, status: 'approved', decidedBy: 'grant:g2', decidedVia: 'grant' },
    ])
    expect(ask?.rule).toBe('always allow this exact addStory call everywhere')
  })

  it('prefers the tool the action names itself, and keeps why it expired', () => {
    const [ask] = cliDecidedAsks([
      {
        ...action,
        status: 'expired',
        toolName: 'saveAgentNote',
        toolArgs: { k: 1 },
        decisionReason: 'cancelled',
      },
    ])
    expect(ask).toMatchObject({
      toolName: 'saveAgentNote',
      args: { k: 1 },
      decisionReason: 'cancelled',
    })
  })

  it('carries the answer a question was decided with', () => {
    const [ask] = cliDecidedAsks([
      { ...action, kind: 'question', status: 'approved', decisionMetadata: { answer: 'A' } },
    ])
    expect(ask?.answer).toBe('A')
  })

  it('leaves out an action still pending', () => {
    expect(cliDecidedAsks([{ ...action, status: 'pending' }])).toEqual([])
  })
})

describe('isAskOutcomeEvent', () => {
  it('is true for a decision and for an approval carried out', () => {
    expect(isAskOutcomeEvent({ type: 'actionDecided' })).toBe(true)
    expect(isAskOutcomeEvent({ type: 'actionExecuted' })).toBe(true)
  })

  it('is false for anything else', () => {
    expect(isAskOutcomeEvent({ type: 'actionRequest' })).toBe(false)
    expect(isAskOutcomeEvent({ type: 'transcriptAppend' })).toBe(false)
    expect(isAskOutcomeEvent(undefined)).toBe(false)
  })
})

describe('withDecidedAction', () => {
  const action = {
    id: 'a1',
    runId: 'r1',
    kind: 'tool-call',
    payload: { tool: 'addStory', args: {} },
    status: 'approved' as const,
  }

  it('adds an ask the moment its decision is announced', () => {
    expect(withDecidedAction([], action).map((a) => [a.id, a.status])).toEqual([['a1', 'approved']])
  })

  it('replaces the copy it had — an approval later carried out', () => {
    const before = withDecidedAction([], action)
    const after = withDecidedAction(before, { ...action, execution: { ok: true, result: '{}' } })
    expect(after).toHaveLength(1)
    expect(after[0]?.execution).toEqual({ ok: true, result: '{}' })
  })

  it('leaves the list as it was for an action still pending', () => {
    const list = withDecidedAction([], action)
    expect(withDecidedAction(list, { ...action, id: 'a2', status: 'pending' })).toBe(list)
  })
})

describe('withAsksAwaitingOutcome', () => {
  const ask = (id: string) => ({ id, toolName: 'addStory', decidedOnRow: true })

  it('keeps an ask that just left the pending list as under way until its decision is known', () => {
    // Observed: approving flashed every row "did not run" — the pending list
    // dropped the ask on click, before the decision itself arrived.
    expect(withAsksAwaitingOutcome([], [ask('a1')], new Set())).toEqual([
      { ...ask('a1'), decidedOnRow: false, awaitingOutcome: true },
    ])
  })

  it('lets it go once its decision is known', () => {
    expect(withAsksAwaitingOutcome([], [ask('a1')], new Set(['a1']))).toEqual([])
  })

  it('leaves asks still pending as they are', () => {
    expect(withAsksAwaitingOutcome([ask('a1')], [ask('a1')], new Set())).toEqual([ask('a1')])
  })
})
