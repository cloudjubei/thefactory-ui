import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'
import { REVIEW_PUSH_APPROVAL_STEP_ID } from './colleagueReviewBranchUpdatesConstants'
import type { ReviewMergeJob } from './colleagueReviewMergeTypes'
import { reviewChatLiveRun, reviewChatSlotKind, reviewRunWorkingView } from './reviewChatSlot'

const CHAT = 'GROUP_TOPIC:g1:review-ZNR-756'

const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'run-1',
    status: 'parked',
    chatContextId: CHAT,
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

describe('reviewChatLiveRun', () => {
  it('is the newest review run of the chat still going', () => {
    const runs = [
      run({ id: 'other-chat', chatContextId: 'GROUP_TOPIC:g1:review-ZNR-1' }),
      run({ id: 'done', status: 'succeeded' }),
      run({ id: 'plain', ticketReview: undefined }),
      run({ id: 'live' }),
      run({ id: 'older-live' }),
    ]
    expect(reviewChatLiveRun(runs, CHAT)?.id).toBe('live')
    expect(reviewChatLiveRun(runs.slice(0, 3), CHAT)).toBeUndefined()
    expect(reviewChatLiveRun(runs, undefined)).toBeUndefined()
  })
})

describe('reviewChatSlotKind', () => {
  it('shows the run’s own card while it needs the person: its approval, a push, a reply it waited for', () => {
    expect(reviewChatSlotKind(atGate, false, true)).toBe('run-decision')
    expect(
      reviewChatSlotKind(
        run({
          park: { reason: 'gate', stepId: REVIEW_PUSH_APPROVAL_STEP_ID, message: '', parkedAt: 1 },
        } as Partial<ProcessRun>),
        true,
        true,
      ),
    ).toBe('run-push')
    expect(
      reviewChatSlotKind(
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
        true,
        true,
      ),
    ).toBe('run-outside')
  })

  it('keeps the run’s working card while it works off the chat, as after the person chose', () => {
    expect(
      reviewChatSlotKind(
        run({ status: 'running', cursor: { stepId: 'merge', iteration: 1 } }),
        false,
        true,
      ),
    ).toBe('run-working')
    expect(
      reviewChatSlotKind(
        run({ status: 'running', cursor: { stepId: 'review', iteration: 1 } }),
        false,
        true,
      ),
    ).toBeUndefined()
    expect(reviewChatSlotKind(run({ status: 'pending' }), false, true)).toBeUndefined()
  })

  it('never shows the reply card beside a run, which starts its own round', () => {
    expect(reviewChatSlotKind(run({ status: 'running' }), true, true)).toBeUndefined()
    expect(reviewChatSlotKind(undefined, true, true)).toBeUndefined()
  })

  it('shows the reply card in an inline review chat a reply waits on, nothing otherwise', () => {
    expect(reviewChatSlotKind(undefined, true, false)).toBe('reply')
    expect(reviewChatSlotKind(undefined, false, false)).toBeUndefined()
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
