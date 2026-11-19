import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'
import { REVIEW_PUSH_APPROVAL_STEP_ID } from './colleagueReviewBranchUpdatesConstants'
import { reviewChatLiveRun, reviewChatSlotKind } from './reviewChatSlot'

const CHAT = 'GROUP_TOPIC:g1:review-ZNR-756'

const run = (over: Partial<ProcessRun> = {}): ProcessRun =>
  ({
    id: 'run-1',
    status: 'parked',
    chatContextId: CHAT,
    ticketReview: { groupId: 'g1', ticketKey: 'ZNR-756', round: 2 },
    plan: {
      steps: [
        { id: 'review', kind: 'agent' },
        { id: 'approval', kind: 'gate', gateKind: 'actions' },
        { id: REVIEW_PUSH_APPROVAL_STEP_ID, kind: 'gate', gateKind: 'actions' },
        { id: 'await-update', kind: 'host' },
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

  it('never shows the reply card beside a run, which starts its own round', () => {
    expect(reviewChatSlotKind(run({ status: 'running' }), true, true)).toBeUndefined()
    expect(reviewChatSlotKind(undefined, true, true)).toBeUndefined()
  })

  it('shows the reply card in an inline review chat a reply waits on, nothing otherwise', () => {
    expect(reviewChatSlotKind(undefined, true, false)).toBe('reply')
    expect(reviewChatSlotKind(undefined, false, false)).toBeUndefined()
  })
})
