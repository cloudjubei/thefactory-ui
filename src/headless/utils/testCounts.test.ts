import { describe, expect, it } from 'vitest'

import {
  aggregateTestCounts,
  checkTestCounts,
  finishedTestFileCount,
  parseTestCounts,
  testCountLabel,
  testTotalsHeadline,
} from './testCounts'
import { TEST_COUNT_NONE_RAN, TEST_TOTALS_TITLES } from './testCountsConstants'

describe('parseTestCounts', () => {
  it('reads the all-passing shape the runner writes', () => {
    expect(parseTestCounts('128/132 passed')).toEqual({
      passed: 128,
      failed: 0,
      skipped: 0,
      total: 132,
    })
  })

  it('reads failures and skips when the runner appends them', () => {
    expect(parseTestCounts('128/132 passed, 1 failed, 3 skipped')).toEqual({
      passed: 128,
      failed: 1,
      skipped: 3,
      total: 132,
    })
  })

  it('tolerates the clauses in either order', () => {
    expect(parseTestCounts('10/12 passed, 2 skipped')?.skipped).toBe(2)
  })

  it('returns undefined for a summary that carries no tally', () => {
    // A missing badge is honest; a guessed number is not.
    expect(parseTestCounts('no type errors')).toBeUndefined()
    expect(parseTestCounts('')).toBeUndefined()
  })

  it('does not mistake a bare number for a tally', () => {
    expect(parseTestCounts('132 tests')).toBeUndefined()
  })
})

const summary = (text: string) => ({ summary: text })

describe('checkTestCounts', () => {
  it('prefers the count the check recorded over its summary', () => {
    expect(
      checkTestCounts({
        summary: 'Command succeeded',
        testCount: { passed: 14, failed: 0, skipped: 0, total: 14 },
      })?.total,
    ).toBe(14)
  })

  it('reads an older record’s count from its summary', () => {
    expect(checkTestCounts(summary('3/4 passed, 1 failed'))).toEqual({
      passed: 3,
      failed: 1,
      skipped: 0,
      total: 4,
    })
  })
})

describe('aggregateTestCounts', () => {
  it('sums every layer that reported a tally', () => {
    expect(
      aggregateTestCounts([
        summary('100/100 passed'),
        summary('28/32 passed, 1 failed, 3 skipped'),
      ]),
    ).toEqual({
      passed: 128,
      failed: 1,
      skipped: 3,
      total: 132,
    })
  })

  it('sums recorded counts with parsed ones', () => {
    expect(
      aggregateTestCounts([
        {
          summary: 'Command succeeded',
          testCount: { passed: 9, failed: 0, skipped: 1, total: 10 },
        },
        summary('5/5 passed'),
      ]),
    ).toEqual({ passed: 14, failed: 0, skipped: 1, total: 15 })
  })

  it('ignores layers whose summary carries no tally', () => {
    expect(aggregateTestCounts([summary('no type errors'), summary('5/5 passed')])?.total).toBe(5)
  })

  it('is undefined when no layer reported one', () => {
    expect(aggregateTestCounts([summary('no type errors')])).toBeUndefined()
    expect(aggregateTestCounts([])).toBeUndefined()
  })
})

describe('testCountLabel', () => {
  it('says nothing when nothing was counted', () => {
    expect(testCountLabel(undefined)).toBeUndefined()
  })

  it('says a run of no test ran none', () => {
    expect(testCountLabel({ passed: 0, failed: 0, skipped: 0, total: 0 })).toBe(TEST_COUNT_NONE_RAN)
  })

  it('counts the tests, in the singular for one', () => {
    expect(testCountLabel({ passed: 14, failed: 0, skipped: 0, total: 14 })).toBe('14 tests')
    expect(testCountLabel({ passed: 1, failed: 0, skipped: 0, total: 1 })).toBe('1 test')
  })

  it('names the failures', () => {
    expect(testCountLabel({ passed: 12, failed: 2, skipped: 0, total: 14 })).toBe(
      '14 tests, 2 failed',
    )
  })
})

describe('testTotalsHeadline', () => {
  const counts = (total: number) => ({ passed: total, failed: 0, skipped: 0, total })
  const stoppedFile = {
    path: 'a.test.ts',
    reason: 'stopped after 30 s',
    stopped: true,
    outputTail: undefined,
  }
  const unfinished = (
    files: (typeof stoppedFile)[],
    finished?: { files: number; passed: number },
  ) => ({
    status: 'error' as const,
    testResults: {
      unfinished: {
        files,
        finished: finished
          ? { ...finished, label: 'x', countLabel: 'y', listed: false }
          : undefined,
      },
    },
  })

  it('fails when a layer failed', () => {
    expect(testTotalsHeadline(counts(14), [{ status: 'failed' }, { status: 'passed' }])).toEqual({
      outcome: 'failed',
      title: TEST_TOTALS_TITLES.failed,
    })
  })

  it('says no test ran rather than that they passed', () => {
    expect(testTotalsHeadline(counts(0), [{ status: 'passed' }])).toEqual({
      outcome: 'none',
      title: TEST_COUNT_NONE_RAN,
    })
  })

  it('passes a run that counted tests and failed none', () => {
    expect(testTotalsHeadline(counts(14), [{ status: 'passed' }]).outcome).toBe('passed')
  })

  it('says a run with a stopped file did not finish, and counts what passed around it', () => {
    expect(
      testTotalsHeadline(counts(132), [unfinished([stoppedFile], { files: 2, passed: 132 })]),
    ).toEqual({
      outcome: 'unfinished',
      title: 'Test run didn’t finish — one file was stopped',
      countsLabel: '✓ 132 in 2 files · 1 file stopped',
    })
  })

  it('counts several stopped files, and a file that crashed as not finished', () => {
    const crashed = { ...stoppedFile, path: 'b.test.ts', reason: 'crashed: boom', stopped: false }
    expect(
      testTotalsHeadline(counts(5), [
        unfinished([stoppedFile, stoppedFile], { files: 1, passed: 5 }),
      ]),
    ).toEqual({
      outcome: 'unfinished',
      title: 'Test run didn’t finish — 2 files were stopped',
      countsLabel: '✓ 5 in 1 file · 2 files stopped',
    })
    expect(testTotalsHeadline(counts(0), [unfinished([crashed])])).toEqual({
      outcome: 'unfinished',
      title: 'Test run didn’t finish — one file ended early',
      countsLabel: '1 file ended early',
    })
  })

  it('says an older record that named no file did not finish, with no counts of its own', () => {
    expect(testTotalsHeadline(counts(132), [{ status: 'error' }])).toEqual({
      outcome: 'unfinished',
      title: TEST_TOTALS_TITLES.unfinished,
    })
  })

  it('lets a failure outrank a layer that did not finish', () => {
    expect(
      testTotalsHeadline(counts(14), [{ status: 'failed' }, unfinished([stoppedFile])]).outcome,
    ).toBe('failed')
  })
})

describe('finishedTestFileCount', () => {
  it('counts the suites the record kept', () => {
    expect(
      finishedTestFileCount({
        summary: 'x',
        testSuites: [
          { name: 'a', tests: 1, passed: 1, failed: 0, skipped: 0 },
          { name: 'b', tests: 1, passed: 1, failed: 0, skipped: 0 },
        ],
      }),
    ).toBe(2)
  })

  it('reads the other files from the summary the runner wrote', () => {
    expect(
      finishedTestFileCount({
        summary: "1 file didn't finish (stopped after 30 s) — 132/132 passed in the other 2",
      }),
    ).toBe(2)
    expect(
      finishedTestFileCount({
        summary: "1 file didn't finish (stopped after 30 s) — 4/4 passed in the other file",
      }),
    ).toBe(1)
  })

  it('is undefined when nothing says', () => {
    expect(finishedTestFileCount({ summary: "1 file didn't finish (stopped after 30 s)" })).toBe(
      undefined,
    )
  })
})
