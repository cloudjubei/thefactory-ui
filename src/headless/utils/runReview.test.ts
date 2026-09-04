import { describe, expect, it } from 'vitest'

import type {
  CliRunLandFailure,
  CliRunVerdict,
  GitMergeResult,
  RunVerification,
  VerificationCheckResult,
  VerificationApproachOption,
} from '../api/generated'
import {
  asRunVerification,
  checkTone,
  formatCostUSD,
  isReviewReasonValid,
  landFailureSummary,
  mergeNotice,
  reviewActionMode,
  reviewChangeCounts,
  runReviewFacts,
  verdictSummary,
  verificationCheckRows,
  verificationHeadline,
  verificationApproachRows,
  formatChangeRequestMessage,
} from './runReview'
import {
  CHANGE_REQUEST_MESSAGE_PREFIX,
  LAND_FAILURE_TITLE,
  MERGE_BLOCKED_FALLBACK,
  MERGE_FAILED_FALLBACK,
  NO_CHECKS_DETAIL,
  NOT_VERIFIED_DETAIL,
} from './runReviewConstants'

function check(over: Partial<VerificationCheckResult> = {}): VerificationCheckResult {
  return {
    id: 'typecheck',
    label: 'Typecheck',
    kind: 'compile',
    status: 'passed',
    durationMs: 1500,
    summary: 'tsc --noEmit clean',
    ...over,
  }
}

function verification(over: Partial<RunVerification> = {}): RunVerification {
  return {
    status: 'passed',
    checks: [check()],
    startedAt: 1000,
    finishedAt: 3500,
    ...over,
  }
}

describe('asRunVerification', () => {
  it('passes through a well-formed verification', () => {
    const v = verification()
    expect(asRunVerification(v)).toBe(v)
  })

  it('rejects null / non-objects (the "no checks configured" answer)', () => {
    expect(asRunVerification(null)).toBeUndefined()
    expect(asRunVerification(undefined)).toBeUndefined()
    expect(asRunVerification('passed')).toBeUndefined()
    expect(asRunVerification(7)).toBeUndefined()
  })

  it('rejects an object with an unknown status or no checks array', () => {
    expect(asRunVerification({ status: 'pending', checks: [] })).toBeUndefined()
    expect(asRunVerification({ status: 'passed' })).toBeUndefined()
    expect(asRunVerification({ status: 'passed', checks: 'none' })).toBeUndefined()
  })

  it('accepts failed and error statuses', () => {
    expect(asRunVerification({ status: 'failed', checks: [] })).toBeDefined()
    expect(asRunVerification({ status: 'error', checks: [] })).toBeDefined()
  })

  it('accepts UNCHECKED — dropping it would hide the very state it exists to show', () => {
    // This narrowing silently discarded the whole verification object for any
    // status it did not enumerate, so a new backend status vanished client-side.
    expect(asRunVerification({ status: 'unchecked', checks: [] })).toBeDefined()
  })
})

describe('checkTone', () => {
  it('maps each check status to its tone', () => {
    expect(checkTone('passed')).toBe('positive')
    expect(checkTone('failed')).toBe('danger')
    expect(checkTone('error')).toBe('danger')
    expect(checkTone('skipped')).toBe('neutral')
  })
})

describe('verificationHeadline', () => {
  it('reports not-run when no verification is stamped', () => {
    const head = verificationHeadline(undefined)
    expect(head.status).toBe('not-run')
    expect(head.tone).toBe('neutral')
    expect(head.label).toBe('Not verified')
    expect(head.detail).toBe(NOT_VERIFIED_DETAIL)
    expect(head.total).toBe(0)
    expect(head.durationMs).toBeUndefined()
  })

  it('tallies checks per status and builds the detail line in order', () => {
    const head = verificationHeadline(
      verification({
        status: 'failed',
        checks: [
          check({ id: 'a', status: 'passed' }),
          check({ id: 'b', status: 'failed' }),
          check({ id: 'c', status: 'error' }),
          check({ id: 'd', status: 'skipped' }),
          check({ id: 'e', status: 'passed' }),
        ],
      }),
    )
    expect(head).toMatchObject({
      status: 'failed',
      tone: 'danger',
      label: 'Checks failed',
      passed: 2,
      failed: 1,
      errored: 1,
      skipped: 1,
      total: 5,
    })
    expect(head.detail).toBe('2 passed · 1 failed · 1 errored · 1 skipped')
  })

  it('is positive when passed', () => {
    expect(verificationHeadline(verification()).tone).toBe('positive')
    expect(verificationHeadline(verification()).label).toBe('Checks passed')
  })

  it('is danger when errored', () => {
    const head = verificationHeadline(verification({ status: 'error', checks: [] }))
    expect(head.tone).toBe('danger')
    expect(head.label).toBe('Checks errored')
  })

  it('is WARNING, never positive, when nothing was checked', () => {
    const head = verificationHeadline(verification({ status: 'unchecked', checks: [] }))
    expect(head.tone).toBe('warning')
    expect(head.tone).not.toBe('positive')
    expect(head.label).toBe('Nothing checked')
  })

  it('shows the reason nothing was checked, not a generic placeholder', () => {
    const head = verificationHeadline(
      verification({
        status: 'unchecked',
        checks: [],
        uncheckedReason: {
          kind: 'no-applicable-checks',
          summary: 'No check applies to .kt, .xml — the built-in checks only cover TypeScript.',
          extensions: ['.kt', '.xml'],
        },
      }),
    )
    expect(head.detail).toContain('.kt')
  })

  it('NEVER shows a positive tone for a verification whose checks all skipped', () => {
    // Defensive: even if a stored record predates the unchecked state (or a
    // future producer gets it wrong), zero executed checks must not read green.
    const head = verificationHeadline(
      verification({
        status: 'passed',
        checks: [{ ...check(), status: 'skipped' }],
      }),
    )
    expect(head.tone).not.toBe('positive')
    expect(head.status).toBe('unchecked')
  })

  it('falls back to a no-checks detail when the run verified nothing', () => {
    expect(verificationHeadline(verification({ status: 'unchecked', checks: [] })).detail).toBe(
      NO_CHECKS_DETAIL,
    )
  })

  it('derives duration from the start/finish span, never negative', () => {
    expect(verificationHeadline(verification({ startedAt: 1000, finishedAt: 3500 }))).toMatchObject(
      {
        durationMs: 2500,
        durationLabel: '2.5s',
      },
    )
    expect(verificationHeadline(verification({ startedAt: 3500, finishedAt: 1000 }))).toMatchObject(
      {
        durationMs: 0,
        durationLabel: '0ms',
      },
    )
  })

  it('has no duration label when nothing ran', () => {
    expect(verificationHeadline(undefined).durationLabel).toBeUndefined()
  })
})

describe('verificationCheckRows', () => {
  it('returns an empty list without a verification', () => {
    expect(verificationCheckRows(undefined)).toEqual([])
  })

  it('tones, formats durations and normalises details + optional', () => {
    const rows = verificationCheckRows(
      verification({
        checks: [
          check({ id: 'a', status: 'failed', durationMs: 2000, details: '  boom  ' }),
          check({ id: 'b', status: 'skipped', durationMs: 0, details: '   ', optional: true }),
          check({ id: 'c', status: 'passed', durationMs: 500 }),
        ],
      }),
    )
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      id: 'a',
      tone: 'danger',
      durationLabel: '2.0s',
      details: 'boom',
      optional: false,
    })
    expect(rows[1]).toMatchObject({ tone: 'neutral', details: undefined, optional: true })
    expect(rows[2]).toMatchObject({ tone: 'positive', durationLabel: '500ms', details: undefined })
  })
})

describe('verdictSummary', () => {
  const base: CliRunVerdict = { decision: 'approved', by: 'user', at: 10 }

  it('labels + tones each decision', () => {
    expect(verdictSummary(base)).toMatchObject({ label: 'Approved', tone: 'positive' })
    expect(verdictSummary({ ...base, decision: 'changes-requested' })).toMatchObject({
      label: 'Changes requested',
      tone: 'warning',
    })
    expect(verdictSummary({ ...base, decision: 'rejected' })).toMatchObject({
      label: 'Rejected',
      tone: 'danger',
    })
  })

  it('labels the author', () => {
    expect(verdictSummary(base).byLabel).toBe('you')
    expect(verdictSummary({ ...base, by: 'reviewer-agent' }).byLabel).toBe('the reviewer agent')
  })

  it('trims notes and drops blank ones', () => {
    expect(verdictSummary({ ...base, notes: '  needs tests  ' }).notes).toBe('needs tests')
    expect(verdictSummary({ ...base, notes: '   ' }).notes).toBeUndefined()
    expect(verdictSummary(base).notes).toBeUndefined()
  })
})

describe('landFailureSummary', () => {
  const base: CliRunLandFailure = { reason: 'not-a-git-repo', at: 5 }

  it('explains each reason', () => {
    expect(landFailureSummary(base)).toEqual({
      title: LAND_FAILURE_TITLE,
      message: 'the project is not a git repository',
    })
    expect(landFailureSummary({ ...base, reason: 'detached-head' }).message).toBe(
      'the project checkout is on a detached HEAD',
    )
    expect(landFailureSummary({ ...base, reason: 'commit-failed' }).message).toBe(
      'the review commit could not be created',
    )
    expect(landFailureSummary({ ...base, reason: 'error' }).message).toBe(
      'the review branch could not be created',
    )
  })

  it('appends the backend message when present', () => {
    expect(landFailureSummary({ ...base, message: '  fatal: not a repo ' }).message).toBe(
      'the project is not a git repository — fatal: not a repo',
    )
    expect(landFailureSummary({ ...base, message: '   ' }).message).toBe(
      'the project is not a git repository',
    )
  })
})

describe('mergeNotice', () => {
  const ok: GitMergeResult = { ok: true }

  it('is silent without a result or on success', () => {
    expect(mergeNotice(undefined)).toBeUndefined()
    expect(mergeNotice(ok)).toBeUndefined()
  })

  it('reports conflicts ahead of everything else', () => {
    const notice = mergeNotice({
      ok: false,
      aborted: true,
      message: 'blocked',
      conflicts: [{ path: 'a.ts' }, { path: 'b.ts' }] as GitMergeResult['conflicts'],
    })
    expect(notice).toEqual({
      tone: 'danger',
      message: '2 conflicts — resolve in the Git tab',
      blocked: false,
    })
  })

  it('singularises a lone conflict', () => {
    const notice = mergeNotice({
      ok: false,
      conflicts: [{ path: 'a.ts' }] as GitMergeResult['conflicts'],
    })
    expect(notice?.message).toBe('1 conflict — resolve in the Git tab')
  })

  it('reads a policy abort as a warning, surfacing the backend reason', () => {
    expect(
      mergeNotice({ ok: false, aborted: true, message: 'verification has not passed' }),
    ).toEqual({ tone: 'warning', message: 'verification has not passed', blocked: true })
    expect(mergeNotice({ ok: false, aborted: true })).toEqual({
      tone: 'warning',
      message: MERGE_BLOCKED_FALLBACK,
      blocked: true,
    })
  })

  it('reads a plain failure as danger', () => {
    expect(mergeNotice({ ok: false, message: 'index locked' })).toEqual({
      tone: 'danger',
      message: 'index locked',
      blocked: false,
    })
    expect(mergeNotice({ ok: false })).toEqual({
      tone: 'danger',
      message: MERGE_FAILED_FALLBACK,
      blocked: false,
    })
  })
})

describe('reviewActionMode', () => {
  const verdict: CliRunVerdict = { decision: 'rejected', by: 'user', at: 1 }

  it('shows the verdict once one exists, branch or not', () => {
    expect(reviewActionMode({ verdict, hasReviewBranch: true })).toBe('decided')
    expect(reviewActionMode({ verdict, hasReviewBranch: false })).toBe('decided')
  })

  it('shows the action row for an undecided review branch', () => {
    expect(reviewActionMode({ verdict: undefined, hasReviewBranch: true })).toBe('actions')
  })

  it('offers direct apply on the no-git path', () => {
    expect(reviewActionMode({ verdict: undefined, hasReviewBranch: false })).toBe('apply')
  })

  it('offers NOTHING for a story run\u2019s per-feature sub-run', () => {
    // A story executes each feature in its own sub-run. Those carry a captured
    // diff but are never landed \u2014 the story's consolidated review is the single
    // place the work lands. Offering apply here put N ungated ways to land
    // fragments of the work beside one gated way to land all of it.
    expect(
      reviewActionMode({ verdict: undefined, hasReviewBranch: false, partOfStoryRun: true }),
    ).toBe('none')
  })

  it('still shows the verdict and the action row for a story sub-run that has one', () => {
    // Suppression is only about the direct-apply path; a real review still wins.
    expect(reviewActionMode({ verdict, hasReviewBranch: false, partOfStoryRun: true })).toBe(
      'decided',
    )
    expect(
      reviewActionMode({ verdict: undefined, hasReviewBranch: true, partOfStoryRun: true }),
    ).toBe('actions')
  })
})

describe('isReviewReasonValid', () => {
  it('requires a non-blank reason', () => {
    expect(isReviewReasonValid('')).toBe(false)
    expect(isReviewReasonValid('   \n ')).toBe(false)
    expect(isReviewReasonValid(' tests missing ')).toBe(true)
  })
})

describe('formatCostUSD', () => {
  it('drops out when unrecorded or nonsensical', () => {
    expect(formatCostUSD(undefined)).toBeUndefined()
    expect(formatCostUSD(Number.NaN)).toBeUndefined()
    expect(formatCostUSD(Number.POSITIVE_INFINITY)).toBeUndefined()
    expect(formatCostUSD(-1)).toBeUndefined()
  })

  it('keeps four decimals under a cent so sub-cent runs stay visible', () => {
    expect(formatCostUSD(0.0012)).toBe('$0.0012')
    expect(formatCostUSD(0.009)).toBe('$0.0090')
  })

  it('uses two decimals from a cent up', () => {
    expect(formatCostUSD(0)).toBe('$0.00')
    expect(formatCostUSD(0.01)).toBe('$0.01')
    expect(formatCostUSD(1.234)).toBe('$1.23')
  })
})

describe('runReviewFacts', () => {
  it('formats both sides when recorded', () => {
    expect(runReviewFacts({ costUSD: 0.42, durationMs: 65000 })).toEqual({
      costLabel: '$0.42',
      durationLabel: '1m 5s',
    })
  })

  it('drops each side independently when unrecorded', () => {
    expect(runReviewFacts({ costUSD: undefined, durationMs: 1500 })).toEqual({
      costLabel: undefined,
      durationLabel: '1.5s',
    })
    expect(runReviewFacts({ costUSD: 2, durationMs: undefined })).toEqual({
      costLabel: '$2.00',
      durationLabel: undefined,
    })
    expect(runReviewFacts({ costUSD: undefined, durationMs: -5 })).toEqual({
      costLabel: undefined,
      durationLabel: undefined,
    })
  })
})

describe('reviewChangeCounts', () => {
  it('is all-zero for no files', () => {
    expect(reviewChangeCounts(undefined)).toEqual({ added: 0, modified: 0, deleted: 0, total: 0 })
    expect(reviewChangeCounts([])).toEqual({ added: 0, modified: 0, deleted: 0, total: 0 })
  })

  it('tallies per status', () => {
    expect(
      reviewChangeCounts([
        { status: 'added' },
        { status: 'added' },
        { status: 'modified' },
        { status: 'deleted' },
      ]),
    ).toEqual({ added: 2, modified: 1, deleted: 1, total: 4 })
  })
})

describe('formatChangeRequestMessage', () => {
  it('sends the user’s notes to the agent, framed as review feedback', () => {
    const msg = formatChangeRequestMessage('Use Bower Bold for headings')
    expect(msg).toContain('Use Bower Bold for headings')
    expect(msg).toContain(CHANGE_REQUEST_MESSAGE_PREFIX)
  })

  it('says the branch is kept, so the agent builds on it rather than starting over', () => {
    expect(formatChangeRequestMessage('x')).toContain('build on it')
  })

  it('sends nothing when the notes are empty', () => {
    expect(formatChangeRequestMessage('   ')).toBeUndefined()
  })

  it('trims the notes so a stray newline is not sent as content', () => {
    expect(formatChangeRequestMessage('  fix it  ')?.endsWith('fix it')).toBe(true)
  })
})

describe('verificationApproachRows', () => {
  const option = (
    id: string,
    availability: VerificationApproachOption['availability'],
  ): VerificationApproachOption => ({
    spec: {
      id,
      label: `Label ${id}`,
      proves: `Proves ${id}`,
      requires: { default: [] },
    } as VerificationApproachOption['spec'],
    availability,
    drivenBy: [],
  })

  it('puts what can be run first, then what is one install away', () => {
    const rows = verificationApproachRows([
      option('a', { status: 'unavailable', missing: ['adb'], hints: ['Install adb.'] }),
      option('b', { status: 'available' }),
    ])
    expect(rows.map((r) => r.id)).toEqual(['b', 'a'])
    expect(rows[0]?.tone).toBe('positive')
  })

  it('omits what does not apply — that is noise, not a next step', () => {
    // Telling someone a screenshot diff does not apply to their backend library
    // is worse than saying nothing.
    const rows = verificationApproachRows([
      option('shot', { status: 'not-applicable', reason: 'not a mobile project' }),
      option('review', { status: 'available' }),
    ])
    expect(rows.map((r) => r.id)).toEqual(['review'])
  })

  it('carries the install hint as the detail, so the row is actionable', () => {
    const rows = verificationApproachRows([
      option('a', {
        status: 'unavailable',
        missing: ['adb', 'androidDevice'],
        hints: ['Install platform-tools.', 'Create a virtual device.'],
      }),
    ])
    expect(rows[0]?.detail).toContain('Install platform-tools.')
    expect(rows[0]?.detail).toContain('Create a virtual device.')
    expect(rows[0]?.tone).toBe('neutral')
  })

  it('is empty for an empty plan, so the caller renders nothing', () => {
    expect(verificationApproachRows([])).toEqual([])
  })
})
