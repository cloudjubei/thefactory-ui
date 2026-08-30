import { describe, it, expect } from 'vitest'
import {
  apiToolCallToGrant,
  cliDecideOutcome,
  cliPendingActionToGrant,
  formatActionLabel,
  isCliActionUpdateEvent,
  isCliRunLifecycleEvent,
  isToolGrantAction,
  pendingActionToolName,
  pickActiveCliRunId,
} from './pendingToolGrants'

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
    })
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

describe('cliPendingActionToGrant', () => {
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
