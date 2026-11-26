import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'
import { REVIEW_PUSH_APPROVAL_STEP_ID } from './colleagueReviewBranchUpdatesConstants'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'
import {
  reviewRunFollowsMerge,
  reviewRunWorkingView,
  ticketReviewLiveRun,
  ticketReviewRunCardKind,
  ticketReviewRunLine,
} from './ticketReviewRun'

const TICKET = { groupId: 'g1', ticketKey: 'ZNR-756' }

const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'run-1',
    status: 'parked',
    ticketReview: { groupId: 'g1', ticketKey: 'ZNR-756', round: 2 },
    plan: {
      steps: [
        { id: 'review', name: 'Review', kind: 'agent', inChat: true },
        { id: 'approval', name: 'Your approval', kind: 'gate', gateKind: 'actions' },
        { id: REVIEW_PUSH_APPROVAL_STEP_ID, kind: 'gate', gateKind: 'actions' },
        { id: 'await-update', kind: 'host' },
        { id: 'update-branches', name: 'Bring the base in', kind: 'action' },
        { id: 'merge', name: 'Merge', kind: 'action' },
      ],
      loops: [],
    },
    ...over,
  }) as unknown as ProcessRun

const atGate = run({
  park: { reason: 'gate', stepId: 'approval', message: '', parkedAt: 1 },
} as Partial<ProcessRun>)

describe('ticketReviewLiveRun', () => {
  const runs = [
    run({ id: 'other-ticket', ticketReview: { groupId: 'g1', ticketKey: 'ZNR-1', round: 1 } }),
    run({ id: 'other-group', ticketReview: { groupId: 'g2', ticketKey: 'ZNR-756', round: 1 } }),
    run({ id: 'done', status: 'succeeded' }),
    run({ id: 'plain', ticketReview: undefined }),
    run({ id: 'live' }),
    run({ id: 'older-live' }),
  ]

  it('is the newest review run of the ticket still going, found by the ticket it reviews', () => {
    expect(ticketReviewLiveRun(runs, TICKET)?.id).toBe('live')
    expect(ticketReviewLiveRun(runs.slice(0, 4), TICKET)).toBeUndefined()
    expect(ticketReviewLiveRun(runs, undefined)).toBeUndefined()
  })

  it('reads a ticket key in any case', () => {
    expect(ticketReviewLiveRun(runs, { groupId: 'g1', ticketKey: 'znr-756' })?.id).toBe('live')
  })

  it('never finds a run by a chat it once held', () => {
    const held = run({
      id: 'held',
      ticketReview: undefined,
      chatContextId: 'GROUP_TOPIC:g1:review-ZNR-756',
    } as Partial<ProcessRun>)
    expect(ticketReviewLiveRun([held], TICKET)).toBeUndefined()
  })
})

describe('ticketReviewRunCardKind', () => {
  it('is the run’s own card while it needs the person: its approval, a push, a reply it waited for', () => {
    expect(ticketReviewRunCardKind(atGate)).toBe('decision')
    expect(
      ticketReviewRunCardKind(
        run({
          park: { reason: 'gate', stepId: REVIEW_PUSH_APPROVAL_STEP_ID, message: '', parkedAt: 1 },
        } as Partial<ProcessRun>),
      ),
    ).toBe('push')
    expect(
      ticketReviewRunCardKind(
        run({
          park: {
            reason: 'step-waiting',
            stepId: 'await-update',
            message: '',
            parkedAt: 1,
            ask: {
              kind: 'blocker',
              agent: 'host',
              title: 'Waiting for a reply',
              detail: 'd',
              outside: { awaits: 'a reply' },
            },
          },
        } as Partial<ProcessRun>),
      ),
    ).toBe('outside')
  })

  it('is its working card while it works on any step, the one in its own chat too', () => {
    expect(
      ticketReviewRunCardKind(
        run({ status: 'running', cursor: { stepId: 'merge', iteration: 1 } }),
      ),
    ).toBe('working')
    expect(
      ticketReviewRunCardKind(
        run({ status: 'running', cursor: { stepId: 'review', iteration: 1 } }),
      ),
    ).toBe('working')
  })

  it('is nothing before it is on a step, or stopped where its page decides', () => {
    expect(ticketReviewRunCardKind(run({ status: 'pending' }))).toBeUndefined()
    expect(ticketReviewRunCardKind(run({ status: 'running' }))).toBeUndefined()
    expect(
      ticketReviewRunCardKind(
        run({
          park: { reason: 'step-failed', stepId: 'update-branches', message: '', parkedAt: 1 },
        } as Partial<ProcessRun>),
      ),
    ).toBeUndefined()
    expect(
      ticketReviewRunCardKind(run({ ticketReview: undefined, ...{ park: atGate.park } })),
    ).toBe(undefined)
  })
})

describe('ticketReviewRunLine', () => {
  it('says the run in one line, as the ticket’s row does, with the run to open in its project', () => {
    const line = ticketReviewRunLine(
      run({
        ...atGate,
        projectId: 'osc-be',
        updatedAt: 5,
        ledger: [],
        loopCounts: {},
      } as Partial<ProcessRun>),
      1_000,
    )
    expect(line).toMatchObject({
      kind: 'review',
      name: 'Review run',
      state: 'Waiting for you: Your approval',
      asks: true,
      open: { kind: 'run', projectId: 'osc-be', runId: 'run-1' },
    })
  })

  it('is nothing for a run that reviews no ticket', () => {
    expect(ticketReviewRunLine(run({ ticketReview: undefined }), 1_000)).toBeUndefined()
  })
})

describe('reviewRunFollowsMerge', () => {
  it('is a review run while it works: only then is its round’s merge worth reading', () => {
    expect(reviewRunFollowsMerge(run({ status: 'running' }))).toBe(true)
    expect(reviewRunFollowsMerge(atGate)).toBe(false)
    expect(reviewRunFollowsMerge(run({ status: 'succeeded' }))).toBe(false)
    expect(reviewRunFollowsMerge(run({ status: 'running', ticketReview: undefined }))).toBe(false)
  })
})

describe('reviewRunWorkingView', () => {
  const ledger = [
    {
      id: 'e1',
      stepId: 'review',
      iteration: 2,
      status: 'done',
      startedAt: 1_000,
      outcome: 'passed',
    },
    { id: 'e2', stepId: 'merge', iteration: 2, status: 'running', startedAt: 2_000 },
  ]
  const merging = run({
    status: 'running',
    cursor: { stepId: 'merge', iteration: 2 },
    ledger,
  } as Partial<ProcessRun>)
  const job = (over: Partial<ReviewMergeJob> = {}): ReviewMergeJob => ({
    jobId: 'j1',
    groupId: 'g1',
    ticketKey: 'ZNR-756',
    round: 2,
    state: 'running',
    startedAt: new Date(2_500).toISOString(),
    pullRequests: [
      { url: 'https://github.com/acme/compass-be/pull/392', state: 'merged' },
      {
        url: 'https://github.com/acme/compass-web-user/pull/302',
        state: 'waiting-for-checks',
        detail: 'Waiting for Playwright',
      },
    ],
    ...over,
  })

  it('says the step the run works on, with its badge', () => {
    expect(reviewRunWorkingView(merging, undefined, 3_000)).toEqual({
      name: 'Review run',
      step: 'Merge',
      badge: { label: 'Running', tone: 'running' },
    })
  })

  it('follows the round’s merge pull request by pull request, ended too, as the run carries on', () => {
    const view = reviewRunWorkingView(merging, job(), 3_000)
    expect(view.merge).toMatchObject({
      prs: [],
      starting: false,
      view: {
        label: 'Merging',
        running: true,
        rows: [
          { name: 'compass-be #392', label: 'Merged' },
          {
            name: 'compass-web-user #302',
            label: 'Waiting for checks',
            detail: 'Waiting for Playwright',
          },
        ],
      },
    })
    const reporting = run({
      status: 'running',
      cursor: { stepId: 'report', iteration: 2 },
      ledger,
    } as Partial<ProcessRun>)
    expect(
      reviewRunWorkingView(reporting, job({ state: 'merged' }), 3_000).merge?.view?.label,
    ).toBe('Merged')
  })

  it('leaves out a merge of another round, or one from before this round began', () => {
    expect(reviewRunWorkingView(merging, job({ round: 1 }), 3_000).merge).toBeUndefined()
    expect(
      reviewRunWorkingView(merging, job({ startedAt: new Date(500).toISOString() }), 3_000).merge,
    ).toBeUndefined()
    expect(reviewRunWorkingView(merging, null, 3_000).merge).toBeUndefined()
  })

  it('says the run is starting before it is on a step', () => {
    expect(reviewRunWorkingView(run({ status: 'running' }), undefined, 3_000).step).toBe('Starting')
  })
})
