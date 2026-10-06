import { MCP_TOOL_CALL_ACTION_KIND } from 'thefactory-tools/constants'
import { describe, it, expect } from 'vitest'
import {
  apiToolCallToGrant,
  cliDecideOutcome,
  cliPendingActionToGrant,
  formatActionLabel,
  grantDecideErrorMessage,
  isCliActionUpdateEvent,
  isCliRunLifecycleEvent,
  isToolGrantAction,
  launchDecisionOf,
  pendingActionToolName,
  pickActiveCliRunId,
  pickActiveStoryRunId,
  cliDecidedAsks,
  withDecidedAction,
  withAsksAwaitingOutcome,
  cliRowAsks,
  isAskOutcomeEvent,
  storedToolCallsAwaitingConfirmation,
} from './pendingToolGrants'
import type { ChatContextAgentRunStory } from '../api/generated'

describe('apiToolCallToGrant', () => {
  it('maps an API tool-call to an api-source grant keyed by toolCallId', () => {
    expect(
      apiToolCallToGrant({ toolCallId: 'tc-1', name: 'writeFile', arguments: { path: 'a.ts' } }),
    ).toEqual({
      id: 'tc-1',
      source: 'api',
      label: 'writeFile',
      detail: { path: 'a.ts' },
      toolName: 'writeFile',
      inline: true,
      args: { path: 'a.ts' },
    })
  })
})

describe('apiToolCallToGrant — launches', () => {
  it('keeps an API feature-work launch for its own panel', () => {
    const grant = apiToolCallToGrant({ toolCallId: 'tc', name: 'startFeatureWork', arguments: {} })
    expect(grant.inline).toBeUndefined()
  })
})

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
  it('lists every CLI ask a row can be tied to, saying which are decided on the row', () => {
    const grants = [
      {
        id: 'a',
        source: 'cli' as const,
        label: 'addStory',
        toolName: 'addStory',
        inline: true,
        args: { t: 1 },
      },
      { id: 'b', source: 'cli' as const, label: 'Network unlock' },
      { id: 'c', source: 'api' as const, label: 'writeFile', toolName: 'writeFile', inline: true },
    ]
    expect(cliRowAsks(grants)).toEqual([
      { id: 'a', toolName: 'addStory', args: { t: 1 }, decidedOnRow: true },
      { id: 'b', decidedOnRow: false },
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

  it('maps a CLI PendingAction to a cli-source grant with a humanised label', () => {
    expect(
      cliPendingActionToGrant({ id: 'a-1', kind: 'network-unlock', payload: { host: 'x' } }),
    ).toEqual({
      id: 'a-1',
      source: 'cli',
      label: 'Network unlock',
      detail: { host: 'x' },
      canGrantPermanently: true,
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
      source: 'cli',
      label: 'Question',
      detail: { question: 'Which env?', options: ['dev', 'prod'] },
      question: { question: 'Which env?', options: ['dev', 'prod'] },
      canGrantPermanently: true,
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
  it('routes once→approved, permanent→approved-permanent, deny→denied', () => {
    expect(cliDecideOutcome('once')).toBe('approved')
    expect(cliDecideOutcome('permanent')).toBe('approved-permanent')
    expect(cliDecideOutcome('deny')).toBe('denied')
  })
})

describe('cliPendingActionToGrant permanent-grant offer', () => {
  it('offers a standing grant for an ordinary gated action', () => {
    const grant = cliPendingActionToGrant({ id: 'a', kind: 'network-unlock', payload: {} })
    expect(grant.canGrantPermanently).toBe(true)
  })

  it('withholds it when the server refuses standing grants', () => {
    // The server downgrades a permanent decision here, so offering the button
    // would tell the user they made a lasting choice that was never recorded.
    const grant = cliPendingActionToGrant({
      id: 'a',
      kind: 'inspect-host-path',
      payload: { path: '/x' },
      noPermanentGrant: true,
    })
    expect(grant.canGrantPermanently).toBe(false)
  })

  it('treats an explicit false the same as absent — the offer stands', () => {
    const grant = cliPendingActionToGrant({
      id: 'a',
      kind: 'network-unlock',
      payload: {},
      noPermanentGrant: false,
    })
    expect(grant.canGrantPermanently).toBe(true)
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

describe('launchDecisionOf', () => {
  it('reads the open-work choice, the run and where it stood', () => {
    expect(launchDecisionOf({ openWork: 'extend', runId: 'r1', state: 'unmerged' })).toEqual({
      openWork: { openWork: 'extend', runId: 'r1', state: 'unmerged' },
    })
  })

  it('leaves out a state it does not know', () => {
    expect(launchDecisionOf({ openWork: 'fresh', runId: 'r1', state: 'odd' })).toEqual({
      openWork: { openWork: 'fresh', runId: 'r1' },
    })
  })

  it('reads how the features are worked, beside or without an open-work choice', () => {
    expect(launchDecisionOf({ featureProcessId: 'feature-self-verified' })).toEqual({
      featureProcessId: 'feature-self-verified',
    })
    expect(
      launchDecisionOf({ openWork: 'fresh', runId: 'r1', featureProcessId: 'feature-default' }),
    ).toEqual({ openWork: { openWork: 'fresh', runId: 'r1' }, featureProcessId: 'feature-default' })
  })

  it('reads the proof plans the person confirmed, and whether to save them', () => {
    expect(
      launchDecisionOf({
        proofPlans: { f1: { kinds: ['manual', 'unit-tests'] } },
        saveProofPlans: true,
      }),
    ).toEqual({ proofPlans: { f1: { kinds: ['unit-tests', 'manual'] } }, saveProofPlans: true })
  })

  it('drops malformed plans and a save with nothing to save', () => {
    expect(
      launchDecisionOf({ proofPlans: { f1: { kinds: ['screens'] } }, saveProofPlans: true }),
    ).toBeUndefined()
  })

  it('is nothing for metadata without either choice', () => {
    expect(launchDecisionOf({ note: 'hi', featureProcessId: '' })).toBeUndefined()
  })

  it('drops an open-work choice without the run it was about', () => {
    expect(launchDecisionOf({ openWork: 'extend' })).toBeUndefined()
  })

  it('is nothing without metadata', () => {
    expect(launchDecisionOf(undefined)).toBeUndefined()
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

describe('storedToolCallsAwaitingConfirmation', () => {
  const tool = (id: string, type: string) => ({
    role: 'tool',
    content: '',
    toolCall: { toolCallId: id, name: 'readProjectNote', arguments: { id } },
    toolResult: { type },
  })

  it('reads the calls a stored chat still waits to have confirmed, so a reloaded page can resume them', () => {
    // Observed: the agent's calls waited in the chat for a day; nothing outside
    // the page that sent the turn knew they were there.
    const messages = [
      { role: 'user', content: 'go' },
      tool('t1', 'require_confirmation'),
      tool('t2', 'require_confirmation'),
    ]
    expect(storedToolCallsAwaitingConfirmation(messages).map((c) => c.toolCallId)).toEqual([
      't1',
      't2',
    ])
  })

  it('reads only the trailing batch, not calls an earlier turn left waiting', () => {
    const messages = [
      tool('old', 'require_confirmation'),
      { role: 'assistant', content: 'later' },
      tool('t1', 'success'),
      tool('t2', 'require_confirmation'),
    ]
    expect(storedToolCallsAwaitingConfirmation(messages).map((c) => c.toolCallId)).toEqual(['t2'])
  })

  it('reads nothing once the chat has moved past its tool calls', () => {
    const messages = [tool('t1', 'require_confirmation'), { role: 'assistant', content: 'done' }]
    expect(storedToolCallsAwaitingConfirmation(messages)).toEqual([])
  })
})
