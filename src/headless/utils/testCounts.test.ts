import { describe, expect, it } from 'vitest'

import { aggregateTestCounts, parseTestCounts } from './testCounts'

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

describe('aggregateTestCounts', () => {
  it('sums every layer that reported a tally', () => {
    expect(aggregateTestCounts(['100/100 passed', '28/32 passed, 1 failed, 3 skipped'])).toEqual({
      passed: 128,
      failed: 1,
      skipped: 3,
      total: 132,
    })
  })

  it('ignores layers whose summary carries no tally', () => {
    expect(aggregateTestCounts(['no type errors', '5/5 passed'])?.total).toBe(5)
  })

  it('is undefined when no layer reported one', () => {
    expect(aggregateTestCounts(['no type errors'])).toBeUndefined()
    expect(aggregateTestCounts([])).toBeUndefined()
  })
})
