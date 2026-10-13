import { describe, expect, it } from 'vitest'
import type { ProcessRun, ProcessWaitingAsk } from 'thefactory-tools/types'

import {
  isResumeParkChoice,
  processWaitingDetails,
  processWaitingHeading,
  processWaitingView,
} from './processWaitingView'
import {
  WAITING_DELEGATED_LABEL,
  WAITING_REQUEST_DECIDED,
  WAITING_REQUESTS_HEADING,
  WAITING_REQUESTS_WORDS,
} from './processWaitingViewConstants'

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
      ['allow-site', 'Always allow api.mckinsey.covision.com and continue'],
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

describe('processWaitingView — several requests left waiting', () => {
  const item = (actionId: string, host: string) => ({
    title: `The developer needs network access to ${host}`,
    detail: `Needs ${host}.`,
    request: {
      actionId,
      actionKind: 'network-unlock',
      toolName: 'requestNetworkUnlock',
      host,
    },
  })
  const several: ProcessWaitingAsk = {
    kind: 'permission',
    agent: 'developer',
    title: 'The developer needs 3 approvals',
    detail: '- a\n- b\n- c',
    items: [
      { ...item('a', 'a.com'), answer: { choice: 'allow-site', at: 1 } },
      { ...item('b', 'b.com'), answer: { choice: 'decline', at: 2 } },
      item('c', 'c.com'),
    ],
  }

  it('heads the card with how many it asks, and says how they are decided', () => {
    const view = processWaitingView(parked(several))!
    expect(view.heading).toBe(`The developer ${WAITING_REQUESTS_HEADING}`)
    expect(view.words).toBe(WAITING_REQUESTS_WORDS(1, 3))
    expect(view.details).toEqual([])
  })

  it('lays out each request with its own answers, or what it was decided as', () => {
    const view = processWaitingView(parked(several))!
    expect(view.requests).toEqual([
      {
        actionId: 'a',
        title: 'The developer needs network access to a.com',
        words: 'Needs a.com.',
        details: [
          { label: 'Host', value: 'a.com' },
          { label: 'Tool', value: 'requestNetworkUnlock' },
        ],
        choices: [],
        decided: WAITING_REQUEST_DECIDED['allow-site'],
      },
      expect.objectContaining({
        actionId: 'b',
        choices: [],
        decided: WAITING_REQUEST_DECIDED.decline,
      }),
      expect.objectContaining({
        actionId: 'c',
        choices: [
          { choice: 'allow', label: 'Allow' },
          { choice: 'allow-site', label: 'Always allow c.com' },
          { choice: 'decline', label: 'Decline' },
        ],
      }),
    ])
    expect(view.requests?.[2]?.decided).toBeUndefined()
  })

  it('says a request answered with the whole card was withdrawn', () => {
    const withdrawn: ProcessWaitingAsk = {
      ...several,
      items: [{ ...item('a', 'a.com'), answer: { choice: 'resolved', at: 1 } }],
    }
    expect(processWaitingView(parked(withdrawn))?.requests?.[0]?.decided).toBe(
      WAITING_REQUEST_DECIDED.withdrawn,
    )
  })

  it('answers the rest at once on the card, never trusting one site for all', () => {
    const choices = processWaitingView(parked(several))!.choices.map((c) => c.choice)
    expect(choices[0]).toBe('allow')
    expect(choices).not.toContain('allow-site')
  })

  it('has no rows for an ask of one request', () => {
    expect(processWaitingView(parked(permission))?.requests).toBeUndefined()
  })
})

describe('isResumeParkChoice', () => {
  it('is every choice that answers through resume, and not handing the ask on', () => {
    expect(isResumeParkChoice({ choice: 'allow', label: 'a', detail: 'd' })).toBe(true)
    expect(isResumeParkChoice({ choice: 'approve', label: 'a', detail: 'd' })).toBe(true)
    expect(isResumeParkChoice({ choice: 'delegate', label: 'a', detail: 'd' })).toBe(false)
  })
})
