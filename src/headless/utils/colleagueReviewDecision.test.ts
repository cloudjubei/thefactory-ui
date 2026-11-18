import { describe, expect, it } from 'vitest'
import type { ColleagueReview, ProcessParkChoice } from 'thefactory-tools/types'
import {
  colleagueReviewDecisionDraft,
  inlineReviewDecisionActions,
  isColleagueReviewDecisionGrant,
  isProcessActionsGate,
  reviewDecisionDecidedLine,
  reviewDecisionMetadata,
  reviewDecisionPullRequests,
  reviewDecisionProblem,
  reviewDecisionVerdict,
  reviewGateAnswer,
  reviewGateResumeBody,
  runReviewDecisionActions,
} from './colleagueReviewDecision'
import type { ReviewDecisionAction } from './colleagueReviewDecisionTypes'

const DRAFT = 'Thanks Priya! One thing left: the email subject still says “Week 46”.'

const action = (id: string, over: Partial<ReviewDecisionAction> = {}): ReviewDecisionAction => ({
  id,
  label: id,
  primary: false,
  editsText: false,
  noteRequired: false,
  ...over,
})

const SEND = action('send-reply', { primary: true, editsText: true })
const MERGE = action('approve-and-merge')
const KEEP = action('request-changes', { noteRequired: true })
const STOP = action('abandon')

describe('isColleagueReviewDecisionGrant', () => {
  it('is the decision card’s ask, under its bare name or a CLI’s prefixed one', () => {
    expect(isColleagueReviewDecisionGrant({ toolName: 'askColleagueReviewDecision' })).toBe(true)
    expect(
      isColleagueReviewDecisionGrant({ toolName: 'mcp__overseer__askColleagueReviewDecision' }),
    ).toBe(true)
    expect(
      isColleagueReviewDecisionGrant({ detail: { tool: 'askColleagueReviewDecision', args: {} } }),
    ).toBe(true)
  })

  it('is no other ask', () => {
    expect(isColleagueReviewDecisionGrant({ toolName: 'askUser' })).toBe(false)
    expect(isColleagueReviewDecisionGrant({})).toBe(false)
  })
})

describe('colleagueReviewDecisionDraft', () => {
  it('is the reply the agent drafted, from the call’s arguments or the ask’s payload', () => {
    expect(colleagueReviewDecisionDraft({ args: { reply: DRAFT } })).toBe(DRAFT)
    expect(colleagueReviewDecisionDraft({ detail: { args: { reply: DRAFT } } })).toBe(DRAFT)
  })

  it('is empty when there is none', () => {
    expect(colleagueReviewDecisionDraft({ args: { reply: 4 } })).toBe('')
    expect(colleagueReviewDecisionDraft({})).toBe('')
  })
})

describe('inlineReviewDecisionActions', () => {
  it('offers sending the reply first, then approving and merging, reviewing on with a note, and stopping', () => {
    expect(inlineReviewDecisionActions()).toEqual([
      {
        id: 'send-reply',
        label: 'Send in Slack',
        primary: true,
        editsText: true,
        noteRequired: false,
      },
      {
        id: 'approve-and-merge',
        label: 'Approve & merge',
        primary: false,
        editsText: false,
        noteRequired: false,
      },
      {
        id: 'request-changes',
        label: 'Keep reviewing',
        primary: false,
        editsText: false,
        noteRequired: true,
      },
      { id: 'abandon', label: 'Stop', primary: false, editsText: false, noteRequired: false },
    ])
  })
})

describe('runReviewDecisionActions', () => {
  const choices: ProcessParkChoice[] = [
    {
      choice: 'approve',
      label: 'Send the reply',
      detail: 'Post the reply.',
      primary: true,
      action: {
        id: 'send-reply',
        label: 'Send the reply',
        detail: 'Post the reply.',
        primary: true,
        editsText: true,
      },
    },
    {
      choice: 'approve',
      label: 'Archive it',
      detail: 'Keep it for later.',
      action: { id: 'archive', label: 'Archive it', detail: 'Keep it for later.' },
    },
    { choice: 'request-changes', label: 'Send it back', detail: 'Again.', noteRequired: true },
    { choice: 'abandon', label: 'Stop', detail: 'End the run.' },
    { choice: 'retry', label: 'Retry', detail: 'Again.' },
  ]

  it('reads the gate’s actions as the card’s, in the card’s words for those it knows', () => {
    expect(runReviewDecisionActions(choices)).toEqual([
      {
        id: 'send-reply',
        label: 'Send in Slack',
        detail: 'Post the reply.',
        primary: true,
        editsText: true,
        noteRequired: false,
      },
      {
        id: 'archive',
        label: 'Archive it',
        detail: 'Keep it for later.',
        primary: false,
        editsText: false,
        noteRequired: false,
      },
      {
        id: 'request-changes',
        label: 'Keep reviewing',
        detail: 'Again.',
        primary: false,
        editsText: false,
        noteRequired: true,
      },
      {
        id: 'abandon',
        label: 'Stop',
        detail: 'End the run.',
        primary: false,
        editsText: false,
        noteRequired: false,
      },
    ])
  })

  it('is nothing for a stop with no gate actions', () => {
    expect(runReviewDecisionActions([{ choice: 'retry', label: 'Retry', detail: '' }])).toEqual([])
  })
})

describe('reviewDecisionProblem', () => {
  it('holds sending an empty reply', () => {
    expect(reviewDecisionProblem(SEND, '  ', '')).toBe('The reply is empty.')
    expect(reviewDecisionProblem(SEND, DRAFT, '')).toBeUndefined()
  })

  it('holds reviewing on until the note says what to look at', () => {
    expect(reviewDecisionProblem(KEEP, DRAFT, ' ')).toBe('Say what to look at next.')
    expect(reviewDecisionProblem(KEEP, '', 'Check the Monday locale.')).toBeUndefined()
  })

  it('lets the rest go as they are', () => {
    expect(reviewDecisionProblem(MERGE, '', '')).toBeUndefined()
    expect(reviewDecisionProblem(STOP, '', '')).toBeUndefined()
  })
})

describe('reviewDecisionMetadata', () => {
  it('carries the choice, and the reply only when the person changed it', () => {
    expect(reviewDecisionMetadata(SEND, DRAFT, `  ${DRAFT}\n`, '')).toEqual({
      args: { choice: 'send-reply' },
    })
    expect(reviewDecisionMetadata(SEND, DRAFT, ' Thanks, all good. ', '')).toEqual({
      args: { choice: 'send-reply', reply: 'Thanks, all good.' },
    })
  })

  it('carries the note when reviewing on, and nothing else for the rest', () => {
    expect(reviewDecisionMetadata(KEEP, DRAFT, 'edited', ' Check the locale. ')).toEqual({
      args: { choice: 'request-changes', note: 'Check the locale.' },
    })
    expect(reviewDecisionMetadata(MERGE, DRAFT, 'edited', 'note')).toEqual({
      args: { choice: 'approve-and-merge' },
    })
    expect(reviewDecisionMetadata(STOP, DRAFT, 'edited', 'note')).toEqual({
      args: { choice: 'abandon' },
    })
  })
})

describe('reviewGateAnswer', () => {
  it('approves with the action, its text only when it edits text and was changed', () => {
    expect(reviewGateAnswer(SEND, DRAFT, DRAFT, '')).toEqual({
      choice: 'approve',
      gateAction: { id: 'send-reply' },
    })
    expect(reviewGateAnswer(SEND, DRAFT, ' Thanks, all good. ', '')).toEqual({
      choice: 'approve',
      gateAction: { id: 'send-reply', text: 'Thanks, all good.' },
    })
    expect(reviewGateAnswer(MERGE, DRAFT, 'edited', '')).toEqual({
      choice: 'approve',
      gateAction: { id: 'approve-and-merge' },
    })
  })

  it('sends the round back with the note, or stops', () => {
    expect(reviewGateAnswer(KEEP, DRAFT, DRAFT, ' Check the locale. ')).toEqual({
      choice: 'request-changes',
      note: 'Check the locale.',
    })
    expect(reviewGateAnswer(STOP, DRAFT, DRAFT, 'note')).toEqual({ choice: 'abandon' })
  })
})

describe('isProcessActionsGate', () => {
  const run = (gateKind: 'actions' | 'publish', childRunId?: string) => ({
    park: {
      reason: 'gate' as const,
      stepId: 'approval',
      message: '',
      parkedAt: 1,
      ...(childRunId ? { childRunId } : {}),
    },
    plan: { steps: [{ id: 'approval', kind: 'gate' as const, gateKind }] },
  })

  it('is a run parked at its own actions gate', () => {
    expect(isProcessActionsGate(run('actions'))).toBe(true)
  })

  it('is not another gate, a nested run’s stop, or a run that is not parked', () => {
    expect(isProcessActionsGate(run('publish'))).toBe(false)
    expect(isProcessActionsGate(run('actions', 'child'))).toBe(false)
    expect(isProcessActionsGate({ plan: run('actions').plan })).toBe(false)
  })
})

describe('reviewDecisionVerdict', () => {
  const review = {
    groupId: 'osc',
    ticketKey: 'OSC-402',
    findings: [],
    waitingOn: [],
    createdAt: '2026-11-17T09:00:00.000Z',
    updatedAt: '2026-11-17T11:00:00.000Z',
    rounds: [
      {
        n: 1,
        startedAt: '2026-11-17T09:00:00.000Z',
        submission: {
          text: 'Done',
          pastedAt: '2026-11-17T09:00:00.000Z',
          tickets: [],
          pullRequests: [],
          recordings: [],
          links: [],
          attachments: [],
          settings: [],
        },
        reviewedHeads: [],
        claims: [],
        requirements: [],
        verdict: 'approve',
        reply: DRAFT,
        recordedAt: '2026-11-17T10:00:00.000Z',
      },
    ],
  } as unknown as ColleagueReview

  it('is the latest recorded round’s verdict and what it came to', () => {
    expect(reviewDecisionVerdict(review)).toEqual({
      round: 1,
      title: 'Round 1 of 1',
      verdictLabel: 'Approve',
      tone: 'done',
      summary: 'Nothing to fix.',
    })
  })

  it('is nothing before a round is recorded, or without a review', () => {
    const unrecorded = {
      ...review,
      rounds: review.rounds.map(({ recordedAt: _r, verdict: _v, ...r }) => r),
    } as ColleagueReview
    expect(reviewDecisionVerdict(unrecorded)).toBeUndefined()
    expect(reviewDecisionVerdict(null)).toBeUndefined()
    expect(reviewDecisionVerdict(undefined)).toBeUndefined()
  })
})

describe('reviewGateResumeBody', () => {
  it('is what resuming the run sends for each answer', () => {
    expect(
      reviewGateResumeBody({ choice: 'approve', gateAction: { id: 'send-reply', text: 'Hi' } }),
    ).toEqual({ choice: 'approve', gateAction: { id: 'send-reply', text: 'Hi' } })
    expect(reviewGateResumeBody({ choice: 'request-changes', note: 'Again' })).toEqual({
      choice: 'request-changes',
      note: 'Again',
    })
    expect(reviewGateResumeBody({ choice: 'abandon' })).toEqual({ choice: 'abandon' })
  })
})

describe('reviewDecisionDecidedLine', () => {
  it('says what the person chose', () => {
    expect(reviewDecisionDecidedLine(SEND)).toEqual({ tone: 'done', text: 'You chose: send-reply' })
  })
})

describe('reviewDecisionPullRequests', () => {
  it('is the latest recorded round’s pull requests, the backend’s first', () => {
    const pr = (repo: string, number: number) => ({
      url: `https://github.com/acme/${repo}/pull/${number}`,
      host: 'github' as const,
      repo,
      number,
    })
    const round = (n: number, recorded: boolean, prs: ReturnType<typeof pr>[]) => ({
      n,
      ...(recorded ? { recordedAt: '2026-11-17T10:00:00.000Z' } : {}),
      submission: { pullRequests: prs },
    })
    const review = {
      rounds: [
        round(1, true, [pr('old-web', 1)]),
        round(2, true, [pr('coach-web', 77), pr('coach-be', 418)]),
        round(3, false, [pr('next', 3)]),
      ],
    } as unknown as ColleagueReview
    expect(reviewDecisionPullRequests(review).map((p) => p.name)).toEqual([
      'coach-be #418',
      'coach-web #77',
    ])
    expect(reviewDecisionPullRequests(null)).toEqual([])
  })
})
