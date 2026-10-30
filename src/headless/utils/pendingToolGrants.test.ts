import {
  CLI_AGENT_BLOCKER_KIND,
  CLI_AGENT_QUESTION_KIND,
  CLI_AGENT_REMEDY_KIND,
  CLI_AGENT_UNFILTERABLE_MCP_TOOL_NAMES,
  MCP_TOOL_CALL_ACTION_KIND,
} from 'thefactory-tools/constants'
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
  cliActionEventConcernsChat,
  cliRunLifecycleConcernsChat,
  isActionDecidedOnRow,
} from './pendingToolGrants'
import {
  COMPOSER_LAUNCH_TOOL_NAMES,
  USER_INPUT_ACTION_KINDS,
  USER_INPUT_TOOL_NAMES,
} from './pendingToolGrantsConstants'
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

  it('names the turn that raised the ask, so the panel can wait for its rows', () => {
    expect(
      cliPendingActionToGrant({
        id: 'a-7',
        kind: 'tool-call',
        runId: 'run-3',
        payload: { tool: 'addStory', args: {} },
      }).runId,
    ).toBe('run-3')
  })

  it.each([
    ['requestHostFileRead', 'host-file-read'],
    ['requestNetworkUnlock', 'network-unlock'],
    ['inspectProjectPath', 'inspect-host-path'],
    ['answerRunPark', 'process-run-chat:answerRunPark'],
    ['sendChatMessage', 'chat-message-send'],
    ['writeProjectFile', 'project-file-write'],
    ['commitGitChanges', 'project-git-change:commitGitChanges'],
    ['deleteDesignApp', 'design:deleteDesignApp'],
  ])('decides %s, raised under a kind of its own (%s), on its row', (tool, kind) => {
    expect(
      cliPendingActionToGrant({ id: 'a-6', kind, payload: { tool, args: { x: 1 } } }),
    ).toMatchObject({ inline: true, toolName: tool, args: { x: 1 } })
  })

  it.each(['startFeatureWork', 'startGroupWork', 'acceptProjectFeatureRequest'])(
    'keeps the launch %s in the composer’s place',
    (tool) => {
      const grant = cliPendingActionToGrant({
        id: 'a-8',
        kind: MCP_TOOL_CALL_ACTION_KIND,
        payload: { tool, args: { storyId: 's' } },
      })
      expect(grant.inline).toBeUndefined()
    },
  )

  it.each([
    ['askUser', 'question'],
    ['reportBlocked', 'blocker'],
    ['fixDevice', 'remedy'],
  ])('leaves %s, answered rather than approved (%s), off the row', (tool, kind) => {
    const grant = cliPendingActionToGrant({ id: 'a-4', kind, payload: { tool, args: {} } })
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

  it('offers the site a network or fetch ask is about for trusting', () => {
    const unlock = cliPendingActionToGrant({
      id: 'a-1',
      kind: 'network-unlock',
      payload: { tool: 'requestNetworkUnlock', args: { host: 'sc.starcraft-tmg.com' } },
      grantPayload: { tool: 'requestNetworkUnlock', host: 'sc.starcraft-tmg.com' },
    })
    expect(unlock.trustableSite).toBe('sc.starcraft-tmg.com')
    const fetch = cliPendingActionToGrant({
      id: 'a-2',
      kind: 'external-fetch',
      payload: { tool: 'requestExternalFetch', args: { url: 'https://starcraft-tmg.com/x.pdf' } },
      grantPayload: { tool: 'requestExternalFetch', host: 'starcraft-tmg.com' },
    })
    expect(fetch.trustableSite).toBe('starcraft-tmg.com')
  })

  it('offers no site for an ask about none, or one that may not be granted', () => {
    expect(
      cliPendingActionToGrant({
        id: 'a-1',
        kind: MCP_TOOL_CALL_ACTION_KIND,
        payload: { tool: 'addStory', args: {} },
        grantPayload: { tool: 'addStory' },
      }).trustableSite,
    ).toBeUndefined()
    expect(
      cliPendingActionToGrant({
        id: 'a-2',
        kind: 'network-unlock',
        payload: {},
        grantPayload: { tool: 'requestNetworkUnlock', host: 'x.example.com' },
        noPermanentGrant: true,
      }).trustableSite,
    ).toBeUndefined()
    expect(
      cliPendingActionToGrant({
        id: 'a-3',
        kind: 'install-package',
        payload: {},
        grantPayload: { tool: 'requestInstallPackage', host: 'registry.npmjs.org' },
      }).trustableSite,
    ).toBeUndefined()
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
      inline: true,
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
    expect({ ...api, chatRunner: 'cli', runId: 'run-1' }).toEqual(cli)
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
        payload: {
          question: 'Which env?',
          options: [{ label: 'dev', recommended: true }, { label: 'prod' }],
          answerKind: 'branch',
        },
      }),
    ).toEqual({
      id: 'a-2',
      chatRunner: 'cli',
      label: 'Question',
      detail: {
        question: 'Which env?',
        options: [{ label: 'dev', recommended: true }, { label: 'prod' }],
        answerKind: 'branch',
      },
      question: {
        question: 'Which env?',
        options: [{ label: 'dev', recommended: true }, { label: 'prod' }],
        answerKind: 'branch',
      },
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

describe('cliRunLifecycleConcernsChat', () => {
  it("concerns the chat a run's lifecycle event names", () => {
    expect(
      cliRunLifecycleConcernsChat({ type: 'started', chatContextId: '/projects/p' }, '/projects/p'),
    ).toBe(true)
  })

  it("leaves alone a chat another run's lifecycle event names", () => {
    expect(
      cliRunLifecycleConcernsChat(
        { type: 'finished', chatContextId: '/projects/q' },
        '/projects/p',
      ),
    ).toBe(false)
  })

  it('concerns every chat when the event names none, as an older backend or a resumed run sends', () => {
    expect(cliRunLifecycleConcernsChat({ type: 'statusChanged' }, '/projects/p')).toBe(true)
    expect(cliRunLifecycleConcernsChat(null, '/projects/p')).toBe(true)
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

  it('routes trusting the site to a plain approval — the site’s rule is made on its own', () => {
    expect(cliDecideOutcome('trust-site')).toBe('approved')
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

  it('keeps the files a git change card listed, which its result never names', () => {
    const files = [{ path: 'design/drafts/10.html', status: 'modified' }]
    const [ask] = cliDecidedAsks([
      {
        id: 'c1',
        runId: 'run-1',
        kind: 'tool-call',
        status: 'approved',
        payload: {
          tool: 'commitGitChanges',
          args: { message: 'Draft 10' },
          detail: {
            operation: 'commit',
            headline: 'Commit 1 file to dev',
            projectId: 'p',
            repoPath: '/r',
            warning: 'w',
            facts: [],
            diff: { files, patch: '', patchTruncated: false },
          },
        },
      },
    ])
    expect(ask.changeFiles).toEqual(files)
    expect(cliDecidedAsks([{ ...action, status: 'approved' }])[0]).not.toHaveProperty('changeFiles')
  })

  it('keeps why the host withdrew an ask settled elsewhere', () => {
    const [ask] = cliDecidedAsks([
      {
        ...action,
        status: 'expired',
        decisionReason: 'cancelled',
        withdrawnReason: 'Settled elsewhere: the run was deleted.',
      },
    ])
    expect(ask).toMatchObject({
      status: 'expired',
      withdrawnReason: 'Settled elsewhere: the run was deleted.',
    })
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

describe('cliActionEventConcernsChat', () => {
  const event = (action: Record<string, unknown> | undefined) => ({
    runId: 'r1',
    type: 'actionRequest',
    event: { runId: 'r1', ...(action ? { action } : {}) },
  })

  it('concerns the chat its action names', () => {
    expect(cliActionEventConcernsChat(event({ id: 'a1', chatContextId: 'chat-1' }), 'chat-1')).toBe(
      true,
    )
  })

  it('does not concern a chat its action does not name', () => {
    expect(cliActionEventConcernsChat(event({ id: 'a1', chatContextId: 'chat-2' }), 'chat-1')).toBe(
      false,
    )
  })

  it('concerns a chat that already shows the action, whichever chat it names', () => {
    const shows = (id: string) => id === 'a1'
    expect(
      cliActionEventConcernsChat(event({ id: 'a1', chatContextId: 'chat-2' }), 'chat-1', shows),
    ).toBe(true)
    expect(
      cliActionEventConcernsChat(event({ id: 'a9', chatContextId: 'chat-2' }), 'chat-1', shows),
    ).toBe(false)
  })

  it('concerns every chat when it cannot tell which chat the action is for', () => {
    expect(cliActionEventConcernsChat(event({ id: 'a1' }), 'chat-1')).toBe(true)
    expect(cliActionEventConcernsChat(event(undefined), 'chat-1')).toBe(true)
    expect(cliActionEventConcernsChat(event({ id: 'a1', chatContextId: 7 }), 'chat-1')).toBe(true)
    expect(cliActionEventConcernsChat(null, 'chat-1')).toBe(true)
  })
})

/**
 * Every ask the backend can raise in a chat — each chat scope's gated host
 * tools, the tools that ask under the MCP tool-call kind, and thefactory-tools'
 * gated CLI tools — as `[tool, kind]`, read off the backend's chat tool bundles
 * for a project, story, feature, topic, run, feature-request, agent-run, group
 * and general chat.
 */
const BACKEND_ASKS: ReadonlyArray<readonly [string, string]> = [
  ['abortGitMerge', 'project-git-change:abortGitMerge'],
  ['acceptDesignProposal', 'design:acceptDesignProposal'],
  ['acceptProjectFeatureRequest', 'tool-call'],
  ['addDesignApp', 'tool-call'],
  ['addDesignScreen', 'tool-call'],
  ['addDesignState', 'tool-call'],
  ['addFeature', 'group-planning:addFeature'],
  ['addFeature', 'tool-call'],
  ['addStory', 'group-planning:addStory'],
  ['addStory', 'tool-call'],
  ['addStoryNote', 'group-planning:addStoryNote'],
  ['addStoryNote', 'tool-call'],
  ['answerGroupRunPark', 'process-group-run-action:answerGroupRunPark'],
  ['answerRunPark', 'process-run-action:answerRunPark'],
  ['answerRunPark', 'process-run-chat:answerRunPark'],
  ['applyDesignTidy', 'design:applyDesignTidy'],
  ['applyGitMergePlan', 'project-git-change:applyGitMergePlan'],
  ['applyGitPatch', 'project-git-change:applyGitPatch'],
  ['applyGitStash', 'project-git-change:applyGitStash'],
  ['archiveChatFromList', 'tool-call'],
  ['askUser', 'question'],
  ['astEditNode', 'tool-call'],
  ['astRenameSymbol', 'tool-call'],
  ['blockFeature', 'tool-call'],
  ['blockStory', 'tool-call'],
  ['chooseAgentLlmConfig', 'tool-call'],
  ['chooseAgentRunner', 'tool-call'],
  ['chooseDesignProposal', 'tool-call'],
  ['cloneIntoProject', 'project-admin:cloneIntoProject'],
  ['cloneProjectFromGit', 'clone-into-host-path'],
  ['closeRunFeatures', 'process-run-action:closeRunFeatures'],
  ['closeRunFeatures', 'process-run-chat:closeRunFeatures'],
  ['commitGitChanges', 'project-git-change:commitGitChanges'],
  ['completeAssignment', 'tool-call'],
  ['createGitBranch', 'project-git-change:createGitBranch'],
  ['createGroupStory', 'tool-call'],
  ['createLiveDataSource', 'tool-call'],
  ['createNewProject', 'tool-call'],
  ['createProjectFromTemplate', 'tool-call'],
  ['createProjectGroup', 'tool-call'],
  ['createProjectRecord', 'project-data:createProjectRecord'],
  ['decideChatOpenChanges', 'chat-open-changes:decideChatOpenChanges'],
  ['decideDesignTidyMove', 'tool-call'],
  ['decideRunGate', 'process-run-action:decideRunGate'],
  ['decideRunGate', 'process-run-chat:decideRunGate'],
  ['deleteAgentNote', 'tool-call'],
  ['deleteAgentType', 'agent-type-admin:deleteAgentType'],
  ['deleteAssistantConversation', 'chat-delete'],
  ['deleteDesignApp', 'design:deleteDesignApp'],
  ['deleteDesignProposal', 'design:deleteDesignProposal'],
  ['deleteDesignScreen', 'design:deleteDesignScreen'],
  ['deleteDesignState', 'design:deleteDesignState'],
  ['deleteFeature', 'group-planning:deleteFeature'],
  ['deleteFeature', 'tool-call'],
  ['deleteGitBranch', 'project-git-change:deleteGitBranch'],
  ['deleteGroupAgentType', 'agent-type-admin:deleteGroupAgentType'],
  ['deleteGroupNote', 'tool-call'],
  ['deleteGroupStory', 'group-work:deleteGroupStory'],
  ['deleteLiveDataSource', 'live-data:deleteLiveDataSource'],
  ['deleteMemberPaths', 'member-file-edit:deleteMemberPaths'],
  ['deletePaths', 'tool-call'],
  ['deleteRuns', 'tool-call'],
  ['deleteStory', 'group-planning:deleteStory'],
  ['deleteStory', 'tool-call'],
  ['discardChatOpenChanges', 'chat-open-changes:discardChatOpenChanges'],
  ['discardGitChanges', 'project-git-change:discardGitChanges'],
  ['dismissDesignTidy', 'tool-call'],
  ['dropGitStash', 'project-git-change:dropGitStash'],
  ['editCliSettings', 'tool-call'],
  ['editGitCredential', 'tool-call'],
  ['editLlmConfig', 'tool-call'],
  ['editProject', 'tool-call'],
  ['editProjectGroup', 'tool-call'],
  ['editTicketConnection', 'tool-call'],
  ['escalateRunPark', 'process-run-chat:escalateRunPark'],
  ['evaluateKnowledge', 'knowledge-evaluation:evaluateKnowledge'],
  ['fetchGitRemote', 'project-git-change:fetchGitRemote'],
  ['fileDesignProposalEntry', 'tool-call'],
  ['fileSignOffPreRead', 'process-run-chat:fileSignOffPreRead'],
  ['handOverProjectFeatureRequest', 'tool-call'],
  ['holdRun', 'process-run-chat:holdRun'],
  ['importProjectFromPath', 'tool-call'],
  ['inspectProjectPath', 'inspect-host-path'],
  ['keepDesignProposalAsAlternative', 'tool-call'],
  ['markGroupLegLanded', 'process-group-run-action:markGroupLegLanded'],
  ['markProjectFeatureRequestDelivered', 'tool-call'],
  ['mergeGitBranch', 'project-git-change:mergeGitBranch'],
  ['mobileTestAdb', 'device-command'],
  ['mobileTestIdb', 'device-command'],
  ['moveGitBranch', 'project-git-change:moveGitBranch'],
  ['moveProjectData', 'tool-call'],
  ['openGitPullRequest', 'project-git-change:openGitPullRequest'],
  ['proposeDesign', 'tool-call'],
  ['proposeDesignDraft', 'tool-call'],
  ['proposeDesignTidy', 'tool-call'],
  ['proposeFeatureChange', 'process-run-chat:proposeFeatureChange'],
  ['proposeRunFeature', 'process-run-chat:proposeRunFeature'],
  ['proposeRunStart', 'process-run-chat:proposeRunStart'],
  ['proposeStepRerun', 'process-run-chat:proposeStepRerun'],
  ['pullGitBranch', 'project-git-change:pullGitBranch'],
  ['pushGitBranch', 'project-git-change:pushGitBranch'],
  ['readGroupNote', 'group-note-read'],
  ['readProjectNote', 'project-note-read'],
  ['rebuildChatOpenChanges', 'chat-open-changes:rebuildChatOpenChanges'],
  ['recommendTrainingExperiments', 'tool-call'],
  ['recordReviewEvidence', 'tool-call'],
  ['recoverGitText', 'project-git-change:recoverGitText'],
  ['registerCleanupItem', 'tool-call'],
  ['rejectProjectFeatureRequest', 'tool-call'],
  ['removeActionRule', 'action-rules:removeActionRule'],
  ['removeBlocker', 'tool-call'],
  ['removeCliLogin', 'credential-admin:removeCliLogin'],
  ['removeLlmConfig', 'credential-admin:removeLlmConfig'],
  ['removeProcess', 'process-definition:removeProcess'],
  ['removeProcessGroupRun', 'process-group-run-action:removeProcessGroupRun'],
  ['removeProcessRun', 'process-run-action:removeProcessRun'],
  ['removeProcessRun', 'process-run-chat:removeProcessRun'],
  ['removeProject', 'project-admin:removeProject'],
  ['removeProjectGroup', 'project-admin:removeProjectGroup'],
  ['removeStoredGitCredential', 'credential-admin:removeStoredGitCredential'],
  ['removeStoredWebSearchKey', 'credential-admin:removeStoredWebSearchKey'],
  ['removeStoryNote', 'group-planning:removeStoryNote'],
  ['removeStoryNote', 'tool-call'],
  ['removeTicketConnection', 'project-admin:removeTicketConnection'],
  ['renameCliLogin', 'tool-call'],
  ['renameMemberPaths', 'member-file-edit:renameMemberPaths'],
  ['renamePaths', 'tool-call'],
  ['reorderFeature', 'group-planning:reorderFeature'],
  ['reorderFeature', 'tool-call'],
  ['reorderProjectGroups', 'tool-call'],
  ['reorderProjectInGroup', 'tool-call'],
  ['reorderStory', 'group-planning:reorderStory'],
  ['reorderStory', 'tool-call'],
  ['replaceMemberFileText', 'member-file-edit:replaceMemberFileText'],
  ['reportBlocked', 'blocker'],
  ['requestExternalFetch', 'external-fetch'],
  ['requestHostFileRead', 'host-file-read'],
  ['requestInstallPackage', 'install-package'],
  ['requestNetworkUnlock', 'network-unlock'],
  ['requestProjectFeature', 'tool-call'],
  ['requestWorkspaceLimitRaise', 'workspace-limit-raise'],
  ['resetGitChanges', 'project-git-change:resetGitChanges'],
  ['resolveChatOpenChangesToBase', 'chat-open-changes:resolveChatOpenChangesToBase'],
  ['resolveGitMergeConflicts', 'project-git-change:resolveGitMergeConflicts'],
  ['resolveNeedsYouItem', 'process-run-chat:resolveNeedsYouItem'],
  ['resolveRunIntegrationConflict', 'process-run-action:resolveRunIntegrationConflict'],
  ['resolveRunIntegrationConflict', 'process-run-chat:resolveRunIntegrationConflict'],
  ['restartProjectFeatureRequest', 'tool-call'],
  ['restoreDesignVersions', 'tool-call'],
  ['resumeEndedGroupRun', 'process-group-run-action:resumeEndedGroupRun'],
  ['retryRunIntegration', 'process-run-action:retryRunIntegration'],
  ['retryRunIntegration', 'process-run-chat:retryRunIntegration'],
  ['reviveProcessRun', 'process-run-action:reviveProcessRun'],
  ['reviveProcessRun', 'process-run-chat:reviveProcessRun'],
  ['runMemberProjectCheck', 'member-project:runMemberProjectCheck'],
  ['saveAgentNote', 'tool-call'],
  ['saveAgentType', 'tool-call'],
  ['saveAgentTypeSlotDefaults', 'tool-call'],
  ['saveDesignPlaygroundState', 'tool-call'],
  ['saveGroupAgentType', 'tool-call'],
  ['saveGroupAgentTypeSlotDefaults', 'tool-call'],
  ['saveGroupNote', 'tool-call'],
  ['saveMemberAgentNote', 'member-project:saveMemberAgentNote'],
  ['saveProcess', 'tool-call'],
  ['sendBackDesignProposal', 'tool-call'],
  ['sendChatMessage', 'chat-message-send'],
  ['sendRunBackForChanges', 'process-run-action:sendRunBackForChanges'],
  ['sendRunBackForChanges', 'process-run-chat:sendRunBackForChanges'],
  ['setCrossProjectAcceptance', 'tool-call'],
  ['setFeatureStatus', 'tool-call'],
  ['setGroupTicketConnection', 'tool-call'],
  ['setLiveDataSchedule', 'tool-call'],
  ['setProcessCleanupItem', 'process-cleanup:setProcessCleanupItem'],
  ['setProcessCleanupOff', 'process-cleanup:setProcessCleanupOff'],
  ['setProjectOverviewModel', 'tool-call'],
  ['setProjectTicketConnection', 'tool-call'],
  ['setRunManager', 'process-run-action:setRunManager'],
  ['setRunManager', 'process-run-chat:setRunManager'],
  ['setRunModel', 'process-run-action:setRunModel'],
  ['setRunModel', 'process-run-chat:setRunModel'],
  ['setRunTurnLimit', 'process-run-action:setRunTurnLimit'],
  ['setRunTurnLimit', 'process-run-chat:setRunTurnLimit'],
  ['settleRunAlreadyLanded', 'process-run-action:settleRunAlreadyLanded'],
  ['settleRunAlreadyLanded', 'process-run-chat:settleRunAlreadyLanded'],
  ['setupProjectGitRepo', 'project-git-setup'],
  ['showChatInListAgain', 'tool-call'],
  ['spawnAgent', 'tool-call'],
  ['stageGitChanges', 'project-git-change:stageGitChanges'],
  ['startAssistantConversation', 'tool-call'],
  ['startFeatureWork', 'tool-call'],
  ['startGroupWork', 'tool-call'],
  ['startMemberProcess', 'member-project:startMemberProcess'],
  ['startProjectActivity', 'project-data:startProjectActivity'],
  ['startTrainerActivity', 'tool-call'],
  ['stashGitChanges', 'project-git-change:stashGitChanges'],
  ['stopActivity', 'activity:stopActivity'],
  ['stopProcessGroupRun', 'process-group-run-action:stopProcessGroupRun'],
  ['stopProcessRun', 'process-run-action:stopProcessRun'],
  ['stopProcessRun', 'process-run-chat:stopProcessRun'],
  ['submitFeatureQuestionAnswer', 'feature-question:submitFeatureQuestionAnswer'],
  ['subscribeLiveDataSource', 'tool-call'],
  ['switchGitBranch', 'project-git-change:switchGitBranch'],
  ['trustSite', 'action-rules:trustSite'],
  ['uiTestEvaluate', 'browser-script'],
  ['uiTestEvaluateMain', 'browser-script'],
  ['unstageGitChanges', 'project-git-change:unstageGitChanges'],
  ['unsubscribeLiveDataSource', 'tool-call'],
  ['updateCliAgentImage', 'update-cli-image'],
  ['updateDesignEntry', 'tool-call'],
  ['updateFeature', 'group-planning:updateFeature'],
  ['updateFeature', 'tool-call'],
  ['updateGroupStory', 'tool-call'],
  ['updateLiveDataSource', 'tool-call'],
  ['updateProjectRecord', 'project-data:updateProjectRecord'],
  ['updateStory', 'group-planning:updateStory'],
  ['updateStory', 'tool-call'],
  ['updateStoryNote', 'group-planning:updateStoryNote'],
  ['updateStoryNote', 'tool-call'],
  ['withdrawRunChange', 'process-run-chat:withdrawRunChange'],
  ['writeExactReplaces', 'tool-call'],
  ['writeFile', 'tool-call'],
  ['writeMemberFile', 'member-file-edit:writeMemberFile'],
  ['writeProjectFile', 'project-file-write'],
]

const ROW_EXCEPTIONS = [
  'acceptProjectFeatureRequest',
  'askUser',
  'reportBlocked',
  'startFeatureWork',
  'startGroupWork',
]

describe('which asks are decided on their row', () => {
  it('decides every ask the backend raises on its row, but the named exceptions', () => {
    const offRow = BACKEND_ASKS.filter(([tool, kind]) => !isActionDecidedOnRow(kind, tool))
      .map(([tool]) => tool)
      .sort()
    expect(offRow).toEqual(ROW_EXCEPTIONS)
  })

  it('marks each of those asks inline exactly when it is decided on its row', () => {
    for (const [tool, kind] of BACKEND_ASKS) {
      const grant = cliPendingActionToGrant({ id: tool, kind, payload: { tool, args: {} } })
      expect(grant.inline, `${tool} (${kind})`).toBe(
        ROW_EXCEPTIONS.includes(tool) ? undefined : true,
      )
    }
  })

  it('knows every gated tool thefactory-tools registers on a CLI run', () => {
    const known = new Set(BACKEND_ASKS.map(([tool]) => tool))
    for (const tool of CLI_AGENT_UNFILTERABLE_MCP_TOOL_NAMES) expect(known, tool).toContain(tool)
  })

  it('reads the answered kinds as thefactory-tools raises them', () => {
    expect([...USER_INPUT_ACTION_KINDS].sort()).toEqual(
      [CLI_AGENT_QUESTION_KIND, CLI_AGENT_BLOCKER_KIND, CLI_AGENT_REMEDY_KIND].sort(),
    )
  })

  it('names as launches only tools the backend raises', () => {
    const known = new Set(BACKEND_ASKS.map(([tool]) => tool))
    for (const tool of COMPOSER_LAUNCH_TOOL_NAMES) expect(known, tool).toContain(tool)
  })

  it.each(USER_INPUT_TOOL_NAMES)('keeps %s, an answer the person gives, off the row', (tool) => {
    expect(isActionDecidedOnRow(MCP_TOOL_CALL_ACTION_KIND, tool)).toBe(false)
  })

  it('decides an ask nobody named on its row, whatever its kind', () => {
    expect(isActionDecidedOnRow('brand-new-family:doSomething', 'doSomething')).toBe(true)
    expect(isActionDecidedOnRow(MCP_TOOL_CALL_ACTION_KIND, 'brandNewTool')).toBe(true)
  })

  it('decides an ask that names no tool on its row — the panel takes it when no row claims it', () => {
    expect(isActionDecidedOnRow('workspace-limit-raise', undefined)).toBe(true)
  })

  it('reads a launch by its MCP-prefixed name as the launch', () => {
    expect(
      isActionDecidedOnRow(MCP_TOOL_CALL_ACTION_KIND, 'mcp__thefactory__startFeatureWork'),
    ).toBe(false)
  })
})
