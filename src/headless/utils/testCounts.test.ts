import { describe, expect, it } from 'vitest'

import {
  aggregateTestCounts,
  checkTestCounts,
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

  it('fails when a layer failed', () => {
    expect(testTotalsHeadline(counts(14), true)).toEqual({
      outcome: 'failed',
      title: TEST_TOTALS_TITLES.failed,
    })
  })

  it('says no test ran rather than that they passed', () => {
    expect(testTotalsHeadline(counts(0), false)).toEqual({
      outcome: 'none',
      title: TEST_COUNT_NONE_RAN,
    })
  })

  it('passes a run that counted tests and failed none', () => {
    expect(testTotalsHeadline(counts(14), false).outcome).toBe('passed')
  })
})
