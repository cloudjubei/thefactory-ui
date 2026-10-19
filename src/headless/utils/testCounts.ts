import type { VerificationCheckStatus, VerificationTestSuite } from '../api/generated'
import {
  TEST_COUNT_NONE_RAN,
  TEST_RUN_UNFINISHED_COUNTS,
  TEST_RUN_UNFINISHED_TITLE,
  TEST_TOTALS_TITLES,
} from './testCountsConstants'
import type { UnfinishedTestsView } from './testResultsTypes'

/** How many individual tests a run's test checks account for. */
export type TestCounts = {
  passed: number
  failed: number
  skipped: number
  total: number
}

/** How a Tests pane's head reads its run: some failed, some did not finish, none ran, or every one passed. */
export type TestTotalsOutcome = keyof typeof TEST_TOTALS_TITLES

/** One test layer as the head of a Tests pane reads it. */
export type TestTotalsLayer = {
  status: VerificationCheckStatus
  testResults?: { unfinished: UnfinishedTestsView | undefined }
}

/** The head of a Tests pane: how its run came out, and — for a run that did not finish — its counts in words. */
export type TestTotalsHeadline = {
  outcome: TestTotalsOutcome
  title: string
  /** "✓ 132 in 2 files · 1 file stopped" — set only when files did not finish. */
  countsLabel?: string
}

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
 * How a Tests pane's head reads: a failing layer fails it; a layer that did not
 * finish says so — with the files that stopped and what passed around them,
 * when its record named them — a run that counted no test says so, never
 * "passed"; anything else passed.
 */
export function testTotalsHeadline(
  totals: TestCounts,
  layers: readonly TestTotalsLayer[],
): TestTotalsHeadline {
  if (layers.some((l) => l.status === 'failed')) {
    return { outcome: 'failed', title: TEST_TOTALS_TITLES.failed }
  }
  if (layers.some((l) => l.status === 'error')) {
    const views = layers
      .map((l) => l.testResults?.unfinished)
      .filter((v): v is UnfinishedTestsView => v !== undefined)
    const stopped = views.flatMap((v) => v.files)
    if (stopped.length === 0) return { outcome: 'unfinished', title: TEST_TOTALS_TITLES.unfinished }
    const allStopped = stopped.every((f) => f.stopped)
    const finished = views
      .map((v) => v.finished)
      .filter((f): f is NonNullable<typeof f> => f !== undefined)
    const others =
      finished.length > 0
        ? {
            files: finished.reduce((n, f) => n + f.files, 0),
            passed: finished.reduce((n, f) => n + f.passed, 0),
          }
        : undefined
    return {
      outcome: 'unfinished',
      title: TEST_RUN_UNFINISHED_TITLE(stopped.length, allStopped),
      countsLabel: TEST_RUN_UNFINISHED_COUNTS(stopped.length, allStopped, others),
    }
  }
  const outcome: TestTotalsOutcome = totals.total === 0 ? 'none' : 'passed'
  return { outcome, title: TEST_TOTALS_TITLES[outcome] }
}

/**
 * How many test files finished in a run that left some unfinished: the suites
 * its record kept, else what the runner's summary says of "the other" files.
 * `undefined` when neither says. Pure.
 */
export function finishedTestFileCount(check: {
  summary: string
  testSuites?: readonly VerificationTestSuite[]
}): number | undefined {
  if (check.testSuites && check.testSuites.length > 0) return check.testSuites.length
  if (/\bin the other file\b/.test(check.summary)) return 1
  const others = /\bin the other (\d+)\b/.exec(check.summary)
  return others ? Number(others[1]) : undefined
}
