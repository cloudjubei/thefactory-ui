import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  diffFiles,
  diffLineKinds,
  isReviewPushApproval,
  reviewBranchRow,
  reviewBranchStopRows,
  reviewBranchUpdatesOf,
  reviewPushApprovalIntro,
  reviewPushApprovalRows,
  reviewRunRound,
} from './colleagueReviewBranchUpdates'
import { REVIEW_PUSH_COPY } from './colleagueReviewBranchUpdatesConstants'
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
      awaitsPush: true,
      branches: 'dev into feature/ZNR-767',
      files: ['src/app.ts'],
      diffStat: ' src/app.ts | 2 +-',
      diff: '@@ -1 +1 @@\n-a = 1\n+a = 23',
      checks: [
        { label: 'Unit tests', summary: '12 passed', passed: true, tone: 'done' },
        { label: 'Types', summary: '1 error', passed: false, tone: 'stuck' },
      ],
      checksPassed: false,
      checksBadge: { label: 'Checks failed', tone: 'stuck' },
    })
  })

  it('says a failure the base fails on the same way does not block the push, and how every other failure compares', () => {
    const BASE = '28cf0123456789'
    const row = reviewBranchRow({
      ...resolved,
      checks: [
        { label: 'Unit tests', status: 'passed', summary: '12 passed' },
        { label: 'Build', status: 'skipped', summary: 'Not run' },
        {
          label: 'Lint',
          status: 'failed',
          summary: 'Exited 1',
          baseline: { sha: BASE, status: 'failed', verdict: 'pre-existing' },
          outputTail: '✖ 132 problems (132 errors, 0 warnings)',
        },
      ],
      checksPassed: true,
    })
    expect(row.checksBadge).toEqual({ label: 'Checks fail on dev too', tone: 'working' })
    expect(row.checksNote).toBe('Lint fails on dev the same way, so it does not block the push.')
    expect(row.checks).toEqual([
      { label: 'Unit tests', summary: '12 passed', passed: true, tone: 'done' },
      { label: 'Build', summary: 'Not run', passed: false, tone: 'empty' },
      {
        label: 'Lint',
        summary: 'Exited 1',
        passed: false,
        tone: 'working',
        baseLabel: 'fails on dev too',
        baseDetail:
          'Already failing at the base 28cf012 in the same environment — not caused by this change.',
        outputTail: '✖ 132 problems (132 errors, 0 warnings)',
      },
    ])

    const verdicts = reviewBranchRow({
      ...resolved,
      baseBranch: undefined,
      checks: [
        {
          label: 'Lint',
          status: 'failed',
          summary: 'x',
          baseline: { sha: BASE, verdict: 'pre-existing' },
        },
        {
          label: 'Types',
          status: 'failed',
          summary: 'x',
          baseline: { sha: BASE, verdict: 'pre-existing' },
        },
        {
          label: 'Unit',
          status: 'failed',
          summary: 'x',
          baseline: { sha: BASE, verdict: 'partly-pre-existing' },
        },
        { label: 'Build', status: 'error', summary: 'x', baseline: { sha: BASE, verdict: 'new' } },
        {
          label: 'E2E',
          status: 'failed',
          summary: 'x',
          baseline: {
            sha: BASE,
            verdict: 'not-comparable',
            reason: 'one side printed no failing line to compare',
          },
        },
      ],
      checksPassed: false,
    })
    expect(verdicts.checksBadge).toEqual({ label: 'Checks failed', tone: 'stuck' })
    expect(verdicts.checksNote).toBeUndefined()
    expect(verdicts.checks.map((c) => [c.baseLabel, c.tone])).toEqual([
      ['fails on the base too', 'working'],
      ['fails on the base too', 'working'],
      ['partly fails on the base too', 'stuck'],
      ['new on this branch', 'stuck'],
      ['not compared with the base', 'stuck'],
    ])
    expect(verdicts.checks[4]?.baseDetail).toBe(
      'Also failing at the base 28cf012 — the failures could not be compared line by line, so they count against the change. One side printed no failing line to compare.',
    )

    const several = reviewBranchRow({
      ...resolved,
      checks: [
        {
          label: 'Lint',
          status: 'failed',
          summary: 'x',
          baseline: { sha: BASE, verdict: 'pre-existing' },
        },
        {
          label: 'Types',
          status: 'failed',
          summary: 'x',
          baseline: { sha: BASE, verdict: 'pre-existing' },
        },
      ],
      checksPassed: true,
    })
    expect(several.checksNote).toBe(
      'Lint and Types fail on dev the same way, so they do not block the push.',
    )
    expect(reviewBranchRow({ ...resolved, checks: [], checksPassed: true }).checksBadge).toEqual({
      label: 'Checks passed',
      tone: 'done',
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

const fixed: ColleagueReviewBranchUpdate = {
  pullRequestUrl: BE,
  state: 'resolved',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-767',
  conflictedFiles: [],
  detail: 'Fixed the merged result; waits for your approval to push.',
  diffStat: ' src/user.ts | 2 +-',
  diff: '@@ -1 +1 @@\n-id: number\n+id: string',
  checks: [{ label: 'Types', status: 'passed', summary: 'No errors' }],
  checksPassed: true,
}

const failedChecks: ColleagueReviewBranchUpdate = {
  pullRequestUrl: BE,
  state: 'failed',
  baseBranch: 'dev',
  headBranch: 'feature/ZNR-767',
  detail: 'Not brought in: Types failed.',
  worktree: '/tmp/overseer-review-merge/r1/acme-osc-be-418',
  checks: [
    {
      label: 'Types',
      status: 'failed',
      summary: '2 errors',
      outputTail: 'src/user.ts(4,3): TS2322',
    },
    { label: 'Build', status: 'passed', summary: 'Built' },
  ],
  checksPassed: false,
}

describe('reviewBranchRow: a merged result that failed its checks', () => {
  it('says a fix of the merged result apart from a conflict resolved: no files conflicted', () => {
    expect(reviewBranchRow(fixed)).toMatchObject({
      stateLabel: 'Fixed',
      tone: 'review',
      awaitsPush: true,
      files: [],
      checksBadge: { label: 'Checks passed', tone: 'done' },
    })
  })

  it('shows what failed, with what it printed, on one that was not brought in', () => {
    const row = reviewBranchRow(failedChecks)
    expect(row).toMatchObject({
      stateLabel: 'Failed',
      tone: 'stuck',
      detail: 'Not brought in: Types failed.',
      checksPassed: false,
      checksBadge: { label: 'Checks failed', tone: 'stuck' },
    })
    expect(row).not.toHaveProperty('awaitsPush')
    expect(row.checks).toEqual([
      {
        label: 'Types',
        summary: '2 errors',
        passed: false,
        tone: 'stuck',
        outputTail: 'src/user.ts(4,3): TS2322',
      },
      { label: 'Build', summary: 'Built', passed: true, tone: 'done' },
    ])
  })
})

describe('reviewPushApprovalIntro', () => {
  it('says what is being pushed: conflicts resolved, a fix of the merged result, or both', () => {
    expect(reviewPushApprovalIntro(input([resolved]))).toBe(REVIEW_PUSH_COPY.intro)
    expect(reviewPushApprovalIntro(input([fixed]))).toBe(REVIEW_PUSH_COPY.introFixed)
    expect(reviewPushApprovalIntro(input([fixed, resolved]))).toBe(REVIEW_PUSH_COPY.introBoth)
    expect(reviewPushApprovalIntro(input([{ pullRequestUrl: UI, state: 'updated' }, fixed]))).toBe(
      REVIEW_PUSH_COPY.introFixed,
    )
    expect(reviewPushApprovalIntro(input([]))).toBe(REVIEW_PUSH_COPY.intro)
  })
})

describe('reviewBranchStopRows', () => {
  const stopped = (over: object = {}) =>
    ({
      ticketReview: { groupId: 'g', ticketKey: 'A-1', round: 1 },
      park: { reason: 'step-failed', stepId: 'update-branches', message: '', parkedAt: 1 },
      input: {
        reviewBranchUpdates: [{ pullRequestUrl: UI, state: 'updated' }, failedChecks],
      },
      ...over,
    }) as never

  it('is the pull requests the base could not be brought into, where the run stopped on them', () => {
    expect(reviewBranchStopRows(stopped()).map((r) => [r.name, r.stateLabel])).toEqual([
      ['osc-be #418', 'Failed'],
    ])
    const conflicted = { pullRequestUrl: UI, state: 'conflicted', conflictedFiles: ['a.ts'] }
    expect(
      reviewBranchStopRows(stopped({ input: { reviewBranchUpdates: [conflicted] } })).map(
        (r) => r.stateLabel,
      ),
    ).toEqual(['Conflict'])
  })

  it('is nothing at any other stop, or for a run that is no review', () => {
    const park = { reason: 'step-failed', stepId: 'merge', message: '', parkedAt: 1 }
    expect(reviewBranchStopRows(stopped({ park }))).toEqual([])
    expect(
      reviewBranchStopRows(
        stopped({ park: { ...park, reason: 'gate', stepId: 'update-branches' } }),
      ),
    ).toEqual([])
    expect(reviewBranchStopRows(stopped({ park: undefined }))).toEqual([])
    expect(reviewBranchStopRows(stopped({ ticketReview: undefined }))).toEqual([])
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

describe('diffFiles', () => {
  it('splits a diff into one patch per file, each under its path', () => {
    const a =
      'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-x\n+y\n'
    const b = 'diff --git a/b.ts b/b.ts\n--- a/b.ts\n+++ b/b.ts\n@@ -1 +1 @@\n-1\n+2'
    expect(diffFiles(a + b)).toEqual([
      { path: 'src/a.ts', patch: a },
      { path: 'b.ts', patch: b },
    ])
  })

  it('reads a bare patch by its +++ line, and nothing from an empty diff', () => {
    expect(diffFiles('--- a/c.ts\n+++ b/c.ts\n@@ -1 +1 @@\n-1\n+2')[0]?.path).toBe('c.ts')
    expect(diffFiles('')).toEqual([])
  })
})
