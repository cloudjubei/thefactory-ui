import { TEST_COUNT_NONE_RAN, TEST_TOTALS_TITLES } from './testCountsConstants'

/** How many individual tests a run's test checks account for. */
export type TestCounts = {
  passed: number
  failed: number
  skipped: number
  total: number
}

/** How a Tests pane's head reads its run: some failed, none ran, or every one passed. */
export type TestTotalsOutcome = keyof typeof TEST_TOTALS_TITLES

/** What a test count is read from: a check's structured count, else its one-line summary. */
export type TestCountSource = { summary: string; testCount?: TestCounts }

/**
 * Read the per-test tallies out of a test check's one-line summary.
 *
 * PAIRED with `formatTestCountSummary` in thefactory-tools, which writes
 * `"128/132 passed, 1 failed, 3 skipped"`. A check recorded since tools stamps
 * `testCount` carries the numbers themselves ({@link checkTestCounts}); this
 * reads an older record's.
 *
 * Returns `undefined` rather than guessing when the shape is not recognised: a
 * missing badge is honest, a wrong number is not.
 */
export function parseTestCounts(summary: string): TestCounts | undefined {
  const head = /(\d+)\s*\/\s*(\d+)\s+passed/.exec(summary)
  if (!head) return undefined
  const passed = Number(head[1])
  const total = Number(head[2])
  if (!Number.isFinite(passed) || !Number.isFinite(total)) return undefined
  const failed = Number(/(\d+)\s+failed/.exec(summary)?.[1] ?? 0)
  const skipped = Number(/(\d+)\s+skipped/.exec(summary)?.[1] ?? 0)
  return { passed, failed, skipped, total }
}

/** A check's test tallies: its recorded count, else what its summary says. */
export function checkTestCounts(check: TestCountSource): TestCounts | undefined {
  return check.testCount ?? parseTestCounts(check.summary)
}

/**
 * The run's test tallies across every test layer, or `undefined` when no layer
 * reported a count.
 */
export function aggregateTestCounts(checks: readonly TestCountSource[]): TestCounts | undefined {
  const counted = checks.map(checkTestCounts).filter((c): c is TestCounts => c !== undefined)
  if (counted.length === 0) return undefined
  return counted.reduce(
    (acc, c) => ({
      passed: acc.passed + c.passed,
      failed: acc.failed + c.failed,
      skipped: acc.skipped + c.skipped,
      total: acc.total + c.total,
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0 },
  )
}

/** "14 tests", "14 tests, 2 failed", "0 tests ran" — or nothing when nothing was counted. */
export function testCountLabel(counts: TestCounts | undefined): string | undefined {
  if (!counts) return undefined
  if (counts.total === 0) return TEST_COUNT_NONE_RAN
  const tests = `${counts.total} test${counts.total === 1 ? '' : 's'}`
  return counts.failed > 0 ? `${tests}, ${counts.failed} failed` : tests
}

/**
 * How a Tests pane's head reads: a failing layer fails it, a run that counted
 * no test says so — never "passed" — and anything else passed.
 */
export function testTotalsHeadline(
  totals: TestCounts,
  anyFailed: boolean,
): { outcome: TestTotalsOutcome; title: string } {
  const outcome: TestTotalsOutcome = anyFailed ? 'failed' : totals.total === 0 ? 'none' : 'passed'
  return { outcome, title: TEST_TOTALS_TITLES[outcome] }
}
