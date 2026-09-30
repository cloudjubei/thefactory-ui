import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessWaitingAsk } from 'thefactory-tools/types'

import {
  isResumeParkChoice,
  processWaitingDetails,
  processWaitingHeading,
  processWaitingView,
} from './processWaitingView'
import { WAITING_DELEGATED_LABEL } from './processWaitingViewConstants'

const permission: ProcessWaitingAsk = {
  kind: 'permission',
  agent: 'verifier',
  title: 'The verifier needs network access to api.mckinsey.covision.com',
  detail: 'The login screen calls this backend.',
  request: {
    actionId: 'act-1',
    actionKind: 'network-unlock',
    toolName: 'requestNetworkUnlock',
    host: 'api.mckinsey.covision.com',
  },
  runRef: { runId: 'ver-1', agentRunId: 'ag', chatContextId: '/projects/p/stories/s/agents/ag' },
}

function parked(
  ask: ProcessWaitingAsk | undefined,
  over: Partial<NonNullable<ProcessRun['park']>> = {},
) {
  return {
    projectId: 'p',
    park: {
      reason: 'step-waiting' as const,
      stepId: 'verify',
      message: 'Waiting on you',
      parkedAt: 0,
      ...(ask ? { ask } : {}),
      ...over,
    },
  }
}

describe('processWaitingHeading', () => {
  it('names what a permission is for, by the kind of request', () => {
    expect(processWaitingHeading(permission)).toBe('The verifier needs network access')
    expect(
      processWaitingHeading({
        ...permission,
        request: { actionId: 'a', actionKind: 'install-package' },
      }),
    ).toBe('The verifier needs to install a package')
    expect(
      processWaitingHeading({
        ...permission,
        request: { actionId: 'a', actionKind: 'external-fetch' },
      }),
    ).toBe('The verifier needs to fetch a page')
    expect(
      processWaitingHeading({
        ...permission,
        request: { actionId: 'a', actionKind: 'workspace-limit-raise' },
      }),
    ).toBe('The verifier needs more workspace space')
  })

  it('asks for approval of any other request, or one with none recorded', () => {
    expect(
      processWaitingHeading({
        ...permission,
        request: { actionId: 'a', actionKind: 'project-notes' },
      }),
    ).toBe('The verifier needs your approval')
    expect(processWaitingHeading({ kind: 'permission', agent: 'judge' })).toBe(
      'The code reviewer needs your approval',
    )
  })

  it('says a question is a question and a blocker a blocker', () => {
    expect(processWaitingHeading({ kind: 'question', agent: 'developer' })).toBe(
      'The developer has a question',
    )
    expect(processWaitingHeading({ kind: 'blocker', agent: 'fixer' })).toBe('The fixer is blocked')
  })
})

describe('processWaitingDetails', () => {
  it('lists nothing for a reported blocker — its words are the whole ask', () => {
    expect(
      processWaitingDetails({
        request: { actionId: 'b', actionKind: 'blocker', toolName: 'reportBlocked' },
      }),
    ).toEqual([])
  })

  it('lists the host and the tool a network unlock asked with', () => {
    expect(processWaitingDetails(permission)).toEqual([
      { label: 'Host', value: 'api.mckinsey.covision.com' },
      { label: 'Tool', value: 'requestNetworkUnlock' },
    ])
  })

  it('lists a package with its ecosystem, and a URL', () => {
    expect(
      processWaitingDetails({
        request: {
          actionId: 'a',
          actionKind: 'install-package',
          packageName: 'left-pad',
          ecosystem: 'npm',
        },
      }),
    ).toEqual([{ label: 'Package', value: 'left-pad (npm)' }])
    expect(
      processWaitingDetails({
        request: { actionId: 'a', actionKind: 'install-package', packageName: 'x' },
      }),
    ).toEqual([{ label: 'Package', value: 'x' }])
    expect(
      processWaitingDetails({
        request: { actionId: 'a', actionKind: 'external-fetch', url: 'https://d' },
      }),
    ).toEqual([{ label: 'URL', value: 'https://d' }])
  })

  it('lists nothing for an ask with no request behind it', () => {
    expect(processWaitingDetails({})).toEqual([])
  })
})

describe('processWaitingView', () => {
  it('lays out a permission: heading, its words, what it asked for, its transcript, allow first', () => {
    const view = processWaitingView(parked(permission))!
    expect(view).toMatchObject({
      kind: 'permission',
      heading: 'The verifier needs network access',
      title: permission.title,
      words: 'The login screen calls this backend.',
      transcript: permission.runRef,
      transcriptLabel: 'Open the verifier’s transcript →',
    })
    expect(view.choices.map((c) => [c.choice, c.label])).toEqual([
      ['allow', 'Allow api.mckinsey.covision.com and continue'],
      ['resolved', 'Issue resolved — Continue'],
      ['more-info', 'Provide more info'],
      ['delegate', 'Delegate to another agent'],
      ['abandon', 'Stop here'],
    ])
    expect(view.choices.every((c) => c.detail.length > 0)).toBe(true)
    expect(view.delegated).toBeUndefined()
  })

  it('lays out an agent waiting mid-step — its run still open — exactly like any other', () => {
    expect(processWaitingView(parked(permission, { stepInFlight: true }))).toEqual(
      processWaitingView(parked(permission)),
    )
  })

  it('leads a question with the answer', () => {
    const view = processWaitingView(
      parked({ kind: 'question', agent: 'developer', title: 't', detail: 'Which flavor?' }),
    )!
    expect(view.heading).toBe('The developer has a question')
    expect(view.choices[0]).toMatchObject({ choice: 'more-info', label: 'Answer', primary: true })
    expect(view.transcript).toBeUndefined()
  })

  it('leads a blocker with "Issue resolved — Continue"', () => {
    const view = processWaitingView(
      parked({ kind: 'blocker', agent: 'developer', title: 't', detail: 'Locked.' }),
    )!
    expect(view.heading).toBe('The developer is blocked')
    expect(view.choices[0]).toMatchObject({ choice: 'resolved', primary: true })
  })

  it('offers the chat an ask was handed to', () => {
    const view = processWaitingView(
      parked({
        ...permission,
        delegatedTo: { chatContextId: '/projects/p/topics/t1', topicId: 't1', at: 1 },
      }),
    )!
    expect(view.delegated).toEqual({
      chatContext: { type: 'PROJECT_TOPIC', projectId: 'p', topicId: 't1' },
      label: WAITING_DELEGATED_LABEL,
    })
  })

  it('is nothing for a story’s mirror — it is answered on the nested run', () => {
    expect(processWaitingView(parked(permission, { childRunId: 'child' }))).toBeUndefined()
  })

  it('is nothing for any other park, or a waiting park that lost its ask', () => {
    expect(processWaitingView(parked(permission, { reason: 'step-failed' }))).toBeUndefined()
    expect(processWaitingView(parked(undefined))).toBeUndefined()
    expect(processWaitingView({ projectId: 'p' })).toBeUndefined()
  })
})

describe('isResumeParkChoice', () => {
  it('is every choice that answers through resume, and not handing the ask on', () => {
    expect(isResumeParkChoice({ choice: 'allow', label: 'a', detail: 'd' })).toBe(true)
    expect(isResumeParkChoice({ choice: 'approve', label: 'a', detail: 'd' })).toBe(true)
    expect(isResumeParkChoice({ choice: 'delegate', label: 'a', detail: 'd' })).toBe(false)
  })
})
