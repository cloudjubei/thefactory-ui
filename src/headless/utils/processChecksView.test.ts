import { DEVELOPER_CHECKS_APPROACH } from 'thefactory-tools/constants'
import type { ProcessLedgerEntry } from 'thefactory-tools/types'
import { describe, expect, it } from 'vitest'

import type { ReviewEvidenceRef, RunVerification, VerificationCheckResult } from '../api/generated'
import { CHECK_CHIP_MARKS } from './checkMethodConstants'
import {
  developerChecksNote,
  latestProcessChecks,
  processCheckRows,
  verificationStatusOf,
  withProcessChecks,
} from './processChecksView'
import {
  DEVELOPER_RAN_NO_CHECKS,
  PROCESS_CHECK_ADVISORY_TONE,
  PROCESS_CHECK_MARKS,
} from './processChecksViewConstants'

function result(over: Partial<VerificationCheckResult> = {}): VerificationCheckResult {
  return {
    id: 'build',
    label: 'Build',
    kind: 'command',
    category: 'build',
    status: 'passed',
    durationMs: 64_000,
    summary: 'Build passed',
    ...over,
  }
}

function entry(over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry {
  return {
    id: 'e1',
    stepId: 'checks',
    iteration: 1,
    status: 'done',
    outcome: 'passed',
    startedAt: 100,
    endedAt: 200,
    checks: [result()],
    ...over,
  }
}

const plan = {
  steps: [
    { id: 'implement', kind: 'agent' as const },
    { id: 'checks', kind: 'check' as const },
    { id: 'verify', kind: 'agent' as const },
  ],
}

function record(over: Partial<RunVerification> = {}): RunVerification {
  return { status: 'passed', checks: [], startedAt: 50, finishedAt: 150, ...over }
}

describe('latestProcessChecks', () => {
  it('reads the newest finished checks step that recorded results', () => {
    const older = entry({ id: 'old', endedAt: 120, checks: [result({ status: 'failed' })] })
    const newer = entry({ id: 'new', endedAt: 300 })
    const latest = latestProcessChecks({
      plan,
      ledger: [older, entry({ id: 'impl', stepId: 'implement', checks: undefined }), newer],
    })
    expect(latest).toEqual({ entryId: 'new', checks: [result()], at: 300 })
  })

  it('passes over an attempt still running and one that recorded nothing', () => {
    const done = entry({ id: 'done' })
    const latest = latestProcessChecks({
      plan,
      ledger: [
        done,
        entry({ id: 'empty', checks: [] }),
        entry({ id: 'live', status: 'running', endedAt: undefined }),
      ],
    })
    expect(latest?.entryId).toBe('done')
  })

  it('reads only steps the plan calls checks', () => {
    expect(latestProcessChecks({ plan, ledger: [entry({ stepId: 'verify' })] })).toBeUndefined()
    expect(latestProcessChecks({ ledger: [entry()] })).toBeUndefined()
    expect(latestProcessChecks(undefined)).toBeUndefined()
  })

  it('dates an attempt with no end by its start', () => {
    expect(latestProcessChecks({ plan, ledger: [entry({ endedAt: undefined })] })?.at).toBe(100)
  })
})

describe('withProcessChecks', () => {
  const step = (checks: VerificationCheckResult[], at = 200) => ({ entryId: 'e', checks, at })

  it('keeps the record as it is when no checks step ran', () => {
    const own = record()
    expect(withProcessChecks(own, undefined)).toBe(own)
    expect(withProcessChecks(undefined, undefined)).toBeUndefined()
  })

  it('stands the step results up as the record when the run stamped none', () => {
    const merged = withProcessChecks(undefined, step([result()], 400))
    expect(merged).toEqual({
      status: 'passed',
      checks: [result()],
      startedAt: 400,
      finishedAt: 400,
    })
  })

  it('replaces the record’s results per method with a newer step’s', () => {
    const staleBuild = result({ id: 'compile', kind: 'compile', category: undefined })
    const tests = result({ id: 'unit', label: 'Unit tests', kind: 'tests', category: undefined })
    const merged = withProcessChecks(
      record({ checks: [staleBuild, tests], finishedAt: 150 }),
      step([result({ id: 'typecheck', category: 'typecheck', status: 'failed' })], 200),
    )
    expect(merged?.checks.map((c) => c.id)).toEqual(['unit', 'typecheck'])
    expect(merged?.status).toBe('failed')
    expect(merged?.finishedAt).toBe(200)
  })

  it('lets an older step fill only what the record lacks', () => {
    const ownBuild = result({ id: 'own-build', summary: 'own' })
    const merged = withProcessChecks(
      record({ checks: [ownBuild], finishedAt: 500 }),
      step([result({ status: 'failed' }), result({ id: 'lint', category: 'lint' })], 200),
    )
    expect(merged?.checks.map((c) => c.id)).toEqual(['own-build', 'lint'])
    expect(merged?.status).toBe('passed')
    expect(merged?.finishedAt).toBe(500)
  })

  it('returns the record untouched when an older step adds nothing new', () => {
    const own = record({ checks: [result()], finishedAt: 500 })
    expect(withProcessChecks(own, step([result({ status: 'failed' })], 200))).toBe(own)
  })

  it('drops the record’s reason for checking nothing once step results are in', () => {
    const merged = withProcessChecks(
      record({
        status: 'unchecked',
        uncheckedReason: { kind: 'nothing-declared', summary: 'Nothing declared' },
      }),
      step([result()]),
    )
    expect(merged?.uncheckedReason).toBeUndefined()
    expect(merged?.status).toBe('passed')
  })

  it('never fails the record over an advisory command', () => {
    const merged = withProcessChecks(
      undefined,
      step([result(), result({ id: 'lint', category: 'lint', status: 'failed', optional: true })]),
    )
    expect(merged?.status).toBe('passed')
  })

  it('reads a record of only skipped commands as unchecked', () => {
    expect(withProcessChecks(undefined, step([result({ status: 'skipped' })]))?.status).toBe(
      'unchecked',
    )
  })
})

describe('verificationStatusOf', () => {
  it('fails over a blocking failure', () => {
    expect(verificationStatusOf([result(), result({ id: 'unit', status: 'error' })])).toBe('failed')
  })

  it('never fails over an advisory one', () => {
    expect(verificationStatusOf([result(), result({ status: 'failed', optional: true })])).toBe(
      'passed',
    )
  })

  it('reads checks that neither passed nor failed as unchecked', () => {
    expect(verificationStatusOf([result({ status: 'skipped' })])).toBe('unchecked')
  })
})

describe('processCheckRows', () => {
  const checkStep = { kind: 'check' as const }

  it('says how many tests a test command ran', () => {
    const [row] = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result({
            id: 'test',
            label: 'Unit tests',
            category: 'test',
            testCount: { total: 14, passed: 14, failed: 0, skipped: 0 },
          }),
        ],
      }),
    })
    expect(row.testCountLabel).toBe('14 tests')
  })

  it('leaves a run of no test to its summary, which says so', () => {
    const [row] = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result({
            id: 'test',
            category: 'test',
            status: 'skipped',
            summary: '0 tests ran — the test command found nothing to run',
            testCount: { total: 0, passed: 0, failed: 0, skipped: 0 },
          }),
        ],
      }),
    })
    expect(row.testCountLabel).toBeUndefined()
    expect(row.summary).toMatch(/^0 tests ran/)
  })

  it('counts nothing for a check that did not count', () => {
    const [row] = processCheckRows({ step: checkStep, latest: entry({ checks: [result()] }) })
    expect(row.testCountLabel).toBeUndefined()
  })

  it('says where each command ran: the sandbox, or the host with the reason', () => {
    const rows = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result({ ranIn: 'sandbox' }),
          result({ id: 'lint', ranIn: 'host', hostReason: 'No sandbox image has swiftlint.' }),
          result({ id: 'old' }),
        ],
      }),
    })
    expect(rows.map((r) => [r.id, r.ranInLabel, r.ranInDetail])).toEqual([
      ['build', 'sandbox', 'Ran in the sandbox.'],
      ['lint', 'host', 'Ran on the host — No sandbox image has swiftlint.'],
      ['old', undefined, undefined],
    ])
  })

  it('labels a failure its base shares, in full or in part, and says how it compared', () => {
    const rows = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result({ status: 'failed', baseline: { sha: '28cf0124f4', verdict: 'pre-existing' } }),
          result({
            id: 'typecheck',
            status: 'failed',
            baseline: {
              sha: '28cf0124f4',
              verdict: 'partly-pre-existing',
              preExistingLines: ['x'],
            },
          }),
          result({ id: 'test', status: 'failed', baseline: { sha: '28cf0124f4', verdict: 'new' } }),
          result({ id: 'format' }),
        ],
      }),
    })
    expect(rows.map((r) => r.baselineLabel)).toEqual([
      'pre-existing',
      'partly pre-existing',
      undefined,
      undefined,
    ])
    expect(rows[0]?.baselineDetail).toBe(
      'Already failing at the base 28cf012 in the same environment — not caused by this change.',
    )
    expect(rows[2]?.baselineDetail).toBe(
      'Not failing this way at the base 28cf012 — caused by this change.',
    )
    expect(rows[3]?.baselineDetail).toBeUndefined()
  })

  it('names the code outside the checkout a command built against', () => {
    const [built, plain] = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result({
            ranIn: 'host',
            dependencyRevisions: [
              { label: 'tools', path: '/w/thefactory-tools', sha: '1a2b3c4d5e', dirty: true },
              { label: 'db', path: '/w/thefactory-db', sha: '9f8e7d6c5b', dirty: false },
            ],
          }),
          result({ id: 'lint' }),
        ],
      }),
    })
    expect(built?.dependencyDetail).toBe(
      'Built against thefactory-tools at 1a2b3c4 with uncommitted changes, thefactory-db at 9f8e7d6',
    )
    expect(plain?.dependencyDetail).toBeUndefined()
  })

  it('lists each command of a checks step with its mark, word and time', () => {
    const rows = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result(),
          result({
            id: 'test',
            label: 'Unit tests',
            category: 'test',
            status: 'failed',
            summary: '  2 failing  ',
            durationMs: 900,
          }),
          result({ id: 'format', label: 'Format', status: 'skipped', summary: '', durationMs: 0 }),
          result({ id: 'typecheck', label: 'Type check', status: 'error' }),
        ],
      }),
    })
    expect(rows).toEqual([
      {
        id: 'build',
        label: 'Build',
        status: 'passed',
        mark: '✓',
        word: 'passed',
        tone: 'done',
        advisory: false,
        summary: 'Build passed',
        durationLabel: '1m 4s',
      },
      {
        id: 'test',
        label: 'Unit tests',
        status: 'failed',
        mark: '✗',
        word: 'failed',
        tone: 'stuck',
        advisory: false,
        summary: '2 failing',
        durationLabel: '900ms',
      },
      {
        id: 'format',
        label: 'Format',
        status: 'skipped',
        mark: PROCESS_CHECK_MARKS.skipped,
        word: 'skipped',
        tone: 'empty',
        advisory: false,
        summary: undefined,
        durationLabel: undefined,
      },
      {
        id: 'typecheck',
        label: 'Type check',
        status: 'error',
        mark: '!',
        word: 'errored',
        tone: 'stuck',
        advisory: false,
        summary: 'Build passed',
        durationLabel: '1m 4s',
      },
    ])
  })

  it('marks an advisory command, and never draws its failure as a stop', () => {
    const [failed, passed] = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result({ id: 'lint', label: 'Lint', status: 'failed', optional: true }),
          result({ id: 'format', label: 'Format', status: 'passed', optional: true }),
        ],
      }),
    })
    expect(failed.advisory).toBe(true)
    expect(failed.tone).toBe(PROCESS_CHECK_ADVISORY_TONE)
    expect(passed.advisory).toBe(true)
    expect(passed.tone).toBe('done')
  })

  it('flags an advisory command that failed or errored, in the amber of its sign-off chip', () => {
    const rows = processCheckRows({
      step: checkStep,
      latest: entry({
        checks: [
          result({ id: 'lint', label: 'Lint', status: 'failed', optional: true }),
          result({ id: 'format', label: 'Format', status: 'error', optional: true }),
        ],
      }),
    })
    for (const row of rows) {
      expect(row).toMatchObject({
        mark: CHECK_CHIP_MARKS.flagged,
        word: 'flagged',
        tone: 'working',
      })
    }
    expect(rows.map((r) => r.status)).toEqual(['failed', 'error'])
  })

  it('draws an advisory command that was skipped as skipped, never flagged', () => {
    const [skipped] = processCheckRows({
      step: checkStep,
      latest: entry({ checks: [result({ id: 'lint', status: 'skipped', optional: true })] }),
    })
    expect(skipped).toMatchObject({ mark: PROCESS_CHECK_MARKS.skipped, word: 'skipped' })
  })

  it('lists nothing for another kind of step, or an attempt that recorded nothing', () => {
    expect(processCheckRows({ step: { kind: 'agent' }, latest: entry() })).toEqual([])
    expect(processCheckRows({ step: checkStep })).toEqual([])
    expect(processCheckRows({ step: checkStep, latest: entry({ checks: undefined }) })).toEqual([])
  })
})

describe('developerChecksNote', () => {
  function ref(over: Partial<ReviewEvidenceRef> = {}): ReviewEvidenceRef {
    return {
      id: 'log',
      kind: 'log',
      path: 'p',
      mediaType: 'text/plain',
      bytes: 1,
      createdAt: 1,
      runId: 'dev',
      projectId: 'p',
      approach: DEVELOPER_CHECKS_APPROACH,
      checkRun: {
        check: 'build',
        status: 'passed',
        summary: 'Build passed',
        commands: ['./gradlew assembleDebug'],
        variant: 'covisionTestDebug',
      },
      ...over,
    }
  }

  it('says what the developer ran, as the host recorded it', () => {
    const note = developerChecksNote(
      [
        ref(),
        ref({
          id: 'lint',
          createdAt: 2,
          checkRun: { check: 'lint', status: 'failed', summary: 'x', commands: [] },
        }),
      ],
      ['developer'],
    )
    expect(note).toEqual({
      text: 'Developer verified: Build ✓ (covisionTestDebug), Lint ✗',
      ran: true,
    })
  })

  it('says a developer, fixer or self-verifying developer ran none', () => {
    for (const role of ['developer', 'fixer', 'developer-verifier']) {
      expect(developerChecksNote([], [role, 'verifier'])).toEqual({
        text: DEVELOPER_RAN_NO_CHECKS,
        ran: false,
      })
    }
  })

  it('says nothing for a section no code-changing agent ran', () => {
    expect(developerChecksNote([], ['verifier'])).toBeUndefined()
    expect(developerChecksNote([], [])).toBeUndefined()
  })

  it('ignores recorded runs filed under any other approach', () => {
    expect(developerChecksNote([ref({ approach: 'compile' })], [])).toBeUndefined()
  })
})
