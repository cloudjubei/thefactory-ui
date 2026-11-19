import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  diffLineKinds,
  isReviewPushApproval,
  reviewBranchRow,
  reviewBranchUpdatesOf,
  reviewPushApprovalRows,
  reviewRunRound,
} from './colleagueReviewBranchUpdates'
import type { ColleagueReviewBranchUpdate } from './colleagueReviewBranchUpdatesTypes'

const BE = 'https://github.com/acme/osc-be/pull/418'
const UI = 'https://github.com/acme/osc-ui/pull/77'

const resolved: ColleagueReviewBranchUpdate = {
  pullRequestUrl: UI,
  state: 'resolved',
  headSha: 'a1',
  newHeadSha: 'b2',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-767',
  conflictedFiles: ['src/app.ts'],
  diffStat: ' src/app.ts | 2 +-',
  diff: '@@ -1 +1 @@\n-a = 1\n+a = 23',
  checks: [
    { label: 'Unit tests', status: 'passed', summary: '12 passed' },
    { label: 'Types', status: 'failed', summary: '1 error' },
  ],
  checksPassed: false,
}

const input = (updates: unknown) => ({ input: { reviewBranchUpdates: updates } }) as never

describe('reviewBranchUpdatesOf', () => {
  it('reads what the run kept, leaving out anything malformed', () => {
    const kept = [
      resolved,
      { pullRequestUrl: BE },
      { state: 'updated' },
      { pullRequestUrl: BE, state: 'odd' },
      7,
    ]
    expect(reviewBranchUpdatesOf(input(kept))).toEqual([resolved])
    expect(reviewBranchUpdatesOf(input('nope'))).toEqual([])
    expect(reviewBranchUpdatesOf({} as never)).toEqual([])
  })
})

describe('reviewBranchRow', () => {
  it('names the pull request and gives its state, branches, files, changes and checks', () => {
    expect(reviewBranchRow(resolved)).toEqual({
      url: UI,
      name: 'osc-ui #77',
      stateLabel: 'Resolved',
      tone: 'review',
      branches: 'dev into feature/ZNR-767',
      files: ['src/app.ts'],
      diffStat: ' src/app.ts | 2 +-',
      diff: '@@ -1 +1 @@\n-a = 1\n+a = 23',
      checks: [
        { label: 'Unit tests', summary: '12 passed', passed: true },
        { label: 'Types', summary: '1 error', passed: false },
      ],
      checksPassed: false,
    })
  })

  it('keeps a link it cannot name, and leaves out what it does not have', () => {
    expect(
      reviewBranchRow({ pullRequestUrl: 'x', state: 'updated', detail: 'GitHub brought dev in.' }),
    ).toEqual({
      url: 'x',
      name: 'x',
      stateLabel: 'Updated',
      tone: 'done',
      detail: 'GitHub brought dev in.',
      files: [],
      checks: [],
    })
  })
})

describe('reviewPushApprovalRows', () => {
  it('lists the resolved first, then the rest in the run’s order', () => {
    const rows = reviewPushApprovalRows(input([{ pullRequestUrl: BE, state: 'updated' }, resolved]))
    expect(rows.map((r) => r.name)).toEqual(['osc-ui #77', 'osc-be #418'])
  })
})

describe('isReviewPushApproval', () => {
  const run = (over: Partial<ProcessRun>) =>
    ({ ticketReview: { groupId: 'g', ticketKey: 'A-1', round: 1 }, ...over }) as ProcessRun
  it('is a review run stopped at its push approval only', () => {
    const at = { reason: 'gate', stepId: 'push-approval', message: '', parkedAt: 1 } as const
    expect(isReviewPushApproval(run({ park: at }))).toBe(true)
    expect(isReviewPushApproval(run({ park: { ...at, stepId: 'approval' } }))).toBe(false)
    expect(isReviewPushApproval(run({ park: { ...at, reason: 'step-failed' } }))).toBe(false)
    expect(isReviewPushApproval(run({ park: at, ticketReview: undefined }))).toBe(false)
  })
})

describe('diffLineKinds', () => {
  it('reads each line as added, removed, a hunk head or context', () => {
    expect(diffLineKinds('--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n c').map((l) => l.kind)).toEqual([
      'ctx',
      'ctx',
      'hunk',
      'del',
      'add',
      'ctx',
    ])
  })
})

describe('reviewRunRound', () => {
  it('is the review’s latest round, never before the run’s first', () => {
    expect(reviewRunRound({ rounds: [{ n: 1 }, { n: 3 }] }, { round: 1 })).toBe(3)
    expect(reviewRunRound(undefined, { round: 2 })).toBe(2)
    expect(reviewRunRound({ rounds: [] }, undefined)).toBeUndefined()
  })
})
