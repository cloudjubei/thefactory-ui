import { describe, expect, it } from 'vitest'

import type {
  CliRunLandFailure,
  CliRunVerdict,
  GitMergeResult,
  RunVerification,
  VerificationCheckResult,
} from '../api/generated'
import {
  asRunVerification,
  checkTone,
  isReviewReasonValid,
  landFailureSummary,
  mergeNotice,
  reviewActionMode,
  reviewChangeCounts,
  runReviewFacts,
  ranReviewChecks,
  reviewCheckGroups,
  reviewCheckMeta,
  testLayerLines,
  verdictSummary,
  verificationCheckRows,
  formatChangeRequestMessage,
  viewedFilesProgress,
} from './runReview'
import {
  CHANGE_REQUEST_MESSAGE_PREFIX,
  LAND_FAILURE_TITLE,
  MERGE_BLOCKED_FALLBACK,
  MERGE_FAILED_FALLBACK,
  LEGACY_CHECK_RECORD_NOTE,
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

  it('carries the code outside the checkout a check built against, and how it compares with the base', () => {
    const [row] = verificationCheckRows(
      verification({
        checks: [
          check({
            status: 'failed',
            dependencyRevisions: [
              { label: 'tools', path: '/w/thefactory-tools', sha: '1a2b3c4d5e', dirty: true },
            ],
            baseline: { sha: '28cf0124f4', status: 'failed', verdict: 'pre-existing' },
          }),
        ],
      }),
    )
    expect(row.dependencyDetail).toBe(
      'Built against thefactory-tools at 1a2b3c4 with uncommitted changes',
    )
    expect(row.baselineDetail).toBe(
      'Already failing at the base 28cf012 in the same environment — not caused by this change.',
    )
  })

  it('carries neither for a check that resolved nothing outside its checkout and was not compared', () => {
    const [row] = verificationCheckRows(verification({ checks: [check({})] }))
    expect(row.dependencyDetail).toBeUndefined()
    expect(row.baselineDetail).toBeUndefined()
  })

  it('carries what a command check ran, on which variant, where, and how many tests', () => {
    const [row] = verificationCheckRows(
      verification({
        checks: [
          check({
            id: 'test',
            label: 'Unit tests',
            kind: 'command',
            category: 'test',
            command: ' ./gradlew testDebugUnitTest ',
            variant: 'debug',
            ranIn: 'host',
            hostReason: 'No sandbox image has the Android SDK.',
            testCount: { total: 14, passed: 14, failed: 0, skipped: 0 },
          }),
        ],
      }),
    )
    expect(row).toMatchObject({
      method: 'tests',
      command: './gradlew testDebugUnitTest',
      variant: 'debug',
      ranInDetail: 'Ran on the host — No sandbox image has the Android SDK.',
      testCount: { total: 14 },
      testCountLabel: '14 tests',
    })
  })

  it('leaves a check that said none of that without it', () => {
    const [row] = verificationCheckRows(verification())
    expect(row).toMatchObject({
      method: 'types',
      command: undefined,
      variant: undefined,
      variantReason: undefined,
      modules: undefined,
      coverageNote: undefined,
      ranInDetail: undefined,
      testCount: undefined,
      testCountLabel: undefined,
      testResults: undefined,
      legacyNote: undefined,
    })
  })

  it('carries why its variant, the modules it covered, what it could not, and each suite', () => {
    const [row] = verificationCheckRows(
      verification({
        checks: [
          check({
            kind: 'command',
            category: 'test',
            command: './gradlew :app:testMckinseyOnsiteDebugUnitTest :library:testDebugUnitTest',
            variant: 'mckinseyOnsiteDebug',
            variantReason: 'the change touches app/src/mckinseyOnsite',
            modules: ['app', 'library'],
            coverageNote: 'data/src/test is not run.',
            testSuites: [
              { name: 'a.ATest', module: 'app', tests: 1, passed: 1, failed: 0, skipped: 0 },
            ],
            testSuitesOmitted: 2,
          }),
        ],
      }),
    )
    expect(row).toMatchObject({
      variantReason: 'the change touches app/src/mckinseyOnsite',
      modules: ['app', 'library'],
      coverageNote: 'data/src/test is not run.',
      testResults: {
        results: { tests: [{ filePath: 'app › a.ATest' }] },
        omittedLabel: '2 more suites not kept',
      },
      legacyNote: undefined,
    })
  })

  it('says a command result kept no command because it predates them, never an empty success', () => {
    const [legacy, modern] = verificationCheckRows(
      verification({
        checks: [
          check({ id: 'test', kind: 'command', category: 'test', summary: 'Command succeeded' }),
          check({ id: 'lint', kind: 'command', command: 'npm run lint' }),
        ],
      }),
    )
    expect(legacy?.legacyNote).toBe(LEGACY_CHECK_RECORD_NOTE)
    expect(modern?.legacyNote).toBeUndefined()
  })

  it('reads a blank command as none kept', () => {
    const [row] = verificationCheckRows(
      verification({ checks: [check({ kind: 'command', command: '   ' })] }),
    )
    expect(row?.legacyNote).toBe(LEGACY_CHECK_RECORD_NOTE)
  })
})

describe('ranReviewChecks', () => {
  it('leaves out a check that was skipped and keeps every one that ran, however it ended', () => {
    const rows = verificationCheckRows(
      verification({
        checks: [
          check({ id: 'a', status: 'passed' }),
          check({ id: 'b', status: 'skipped' }),
          check({ id: 'c', status: 'failed' }),
          check({ id: 'd', status: 'error' }),
        ],
      }),
    )
    expect(ranReviewChecks(rows).map((r) => r.id)).toEqual(['a', 'c', 'd'])
  })
})

describe('reviewCheckGroups', () => {
  it('puts a project’s unit-test command under Tests, with the tests checks, and the rest under Build', () => {
    const groups = reviewCheckGroups(
      verification({
        checks: [
          check({ id: 'build', label: 'Build', kind: 'command', category: 'build' }),
          check({ id: 'test', label: 'Unit tests', kind: 'command', category: 'test' }),
          check({ id: 'unit', label: 'Unit', kind: 'tests' }),
          check({ id: 'typecheck' }),
        ],
      }),
    )
    expect(groups.tests.map((r) => r.id)).toEqual(['test', 'unit'])
    expect(groups.build.map((r) => r.id)).toEqual(['build', 'typecheck'])
  })

  it('is empty without a verification', () => {
    expect(reviewCheckGroups(undefined)).toEqual({ tests: [], build: [] })
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
    expect(landFailureSummary({ ...base, reason: 'changes-not-applied' }).message).toBe(
      'part of the run’s change could not be applied, so none of it was landed',
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

  it('names conflicts without git words for a project with no git of its own', () => {
    const notice = mergeNotice(
      { ok: false, conflicts: [{ path: 'a.ts' }, { path: 'b.ts' }] } as GitMergeResult,
      {
        shadow: true,
      },
    )
    expect(notice?.tone).toBe('danger')
    expect(notice?.message).toMatch(/2 conflicts/)
    expect(notice?.message).not.toMatch(/git|merge|branch/i)
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

describe('runReviewFacts', () => {
  const subscriptionRun = {
    costUsd: 0,
    includedTokens: 14_701,
    byModel: [
      {
        provider: 'cursor',
        model: 'composer-2.5',
        label: 'Composer 2.5',
        billing: 'subscription' as const,
        inputTokens: 5825,
        outputTokens: 860,
        cacheReadTokens: 8016,
        cacheWriteTokens: 0,
        costUsd: 0,
      },
    ],
  }

  it('formats both sides when recorded, and keeps the cost for its details', () => {
    expect(runReviewFacts({ cost: { costUsd: 0.42 }, durationMs: 65000 })).toEqual({
      costLabel: '$0.42',
      durationLabel: '1m 5s',
      cost: { costUsd: 0.42 },
    })
  })

  it('labels a subscription run $0.00 — a real charge, with its tokens in the details only', () => {
    const facts = runReviewFacts({ cost: subscriptionRun, durationMs: 1500 })
    expect(facts.costLabel).toBe('$0.00')
    expect(facts.cost).toBe(subscriptionRun)
  })

  it('drops each side independently when unrecorded', () => {
    expect(runReviewFacts({ cost: undefined, durationMs: 1500 })).toEqual({
      costLabel: undefined,
      durationLabel: '1.5s',
    })
    expect(runReviewFacts({ cost: { costUsd: 2 }, durationMs: undefined })).toEqual({
      costLabel: '$2.00',
      durationLabel: undefined,
      cost: { costUsd: 2 },
    })
    expect(runReviewFacts({ cost: undefined, durationMs: -5 })).toEqual({
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

describe('viewedFilesProgress', () => {
  const viewed = [
    { path: 'src/a.ts', headSha: 'h1', at: 1 },
    { path: 'src/b.ts', headSha: 'h0', at: 1 },
  ]

  it('counts a file viewed only at the commit the change is at now', () => {
    expect(viewedFilesProgress(['src/a.ts', 'src/b.ts'], viewed, 'h1')).toEqual({
      viewed: new Set(['src/a.ts']),
      count: 1,
      total: 2,
      all: false,
    })
  })

  it('is all viewed once every changed file is, and never for an empty change', () => {
    expect(viewedFilesProgress(['src/a.ts'], viewed, 'h1').all).toBe(true)
    expect(viewedFilesProgress([], viewed, 'h1').all).toBe(false)
    expect(viewedFilesProgress(['src/a.ts'], undefined, undefined).count).toBe(0)
  })
})

describe('reviewCheckMeta', () => {
  const none = {
    variant: undefined,
    variantReason: undefined,
    modules: undefined,
    testCountLabel: undefined,
    ranInDetail: undefined,
    dependencyDetail: undefined,
    baselineDetail: undefined,
  }

  it('names the variant and why, the modules, the test count and where it ran, in that order', () => {
    expect(
      reviewCheckMeta({
        variant: 'mckinseyOnsiteDebug',
        variantReason: 'the change touches app/src/mckinseyOnsite',
        modules: ['app', 'library'],
        testCountLabel: '14 tests',
        ranInDetail: 'Ran on the host — no sandbox.',
        dependencyDetail: undefined,
        baselineDetail: undefined,
      }),
    ).toBe(
      'Variant mckinseyOnsiteDebug (the change touches app/src/mckinseyOnsite) · Modules app, library · 14 tests · Ran on the host — no sandbox.',
    )
  })

  it('ends with the code outside the checkout it built against, then how it compares with the base', () => {
    expect(
      reviewCheckMeta({
        ...none,
        ranInDetail: 'Ran on the host — siblings.',
        dependencyDetail: 'Built against thefactory-tools at 1a2b3c4 with uncommitted changes',
        baselineDetail:
          'Already failing at the base 28cf012 in the same environment — not caused by this change.',
      }),
    ).toBe(
      'Ran on the host — siblings. · Built against thefactory-tools at 1a2b3c4 with uncommitted changes · Already failing at the base 28cf012 in the same environment — not caused by this change.',
    )
  })

  it('names a variant without a reason plainly', () => {
    expect(reviewCheckMeta({ ...none, variant: 'debug' })).toBe('Variant debug')
  })

  it('leaves out what the check did not say, an empty module list included', () => {
    expect(reviewCheckMeta({ ...none, modules: [], testCountLabel: '0 tests ran' })).toBe(
      '0 tests ran',
    )
  })

  it('is undefined when the check said none of it', () => {
    expect(reviewCheckMeta(none)).toBeUndefined()
  })
})

describe('testLayerLines', () => {
  const layer = {
    summary: '13111/13111 passed',
    testCount: { total: 13111, passed: 13111, failed: 0, skipped: 0 },
    variant: undefined,
    variantReason: undefined,
    modules: undefined,
    testCountLabel: '13111 tests',
    ranInDetail: 'Ran on the host — siblings.',
    dependencyDetail: undefined,
    baselineDetail: undefined,
  }

  it('leaves a lone layer’s totals to the bar above it, and never repeats its count in the meta', () => {
    expect(testLayerLines(layer, 1)).toEqual({
      summary: undefined,
      meta: 'Ran on the host — siblings.',
    })
  })

  it('keeps each layer’s summary when there are several, its count said once', () => {
    expect(testLayerLines(layer, 2)).toEqual({
      summary: '13111/13111 passed',
      meta: 'Ran on the host — siblings.',
    })
  })

  it('keeps the count in the meta when the summary does not say it', () => {
    expect(testLayerLines({ ...layer, summary: 'Command succeeded' }, 2)).toEqual({
      summary: 'Command succeeded',
      meta: '13111 tests · Ran on the host — siblings.',
    })
  })

  it('keeps an uncounted layer’s summary, even alone', () => {
    expect(
      testLayerLines({ ...layer, testCount: undefined, testCountLabel: undefined }, 1),
    ).toEqual({ summary: '13111/13111 passed', meta: 'Ran on the host — siblings.' })
  })
})
