import type { VerificationCheckResult, VerificationTestSuite } from '../api/generated'
import { terminalPlainText } from './terminalOutput'
import { checkTestCounts, type TestCounts } from './testCounts'
import { parseTestFailures, type TestFailure } from './testFailures'
import {
  TEST_SUITE_MODULE_SEPARATOR,
  TEST_SUITES_NOT_RECORDED_FAILURES,
  TEST_SUITES_NOT_RECORDED_TOTALS,
} from './testResultsConstants'
import type {
  CheckTestResults,
  TestResultLike,
  TestStatusLike,
  TestSummaryLike,
} from './testResultsTypes'

type TestResultsSource = Pick<
  VerificationCheckResult,
  | 'label'
  | 'command'
  | 'status'
  | 'summary'
  | 'details'
  | 'durationMs'
  | 'testCount'
  | 'testSuites'
  | 'testSuitesOmitted'
>

function statusOf(summary: Pick<TestSummaryLike, 'passed' | 'failed'>): TestStatusLike {
  return summary.failed > 0 ? 'fail' : summary.passed > 0 ? 'ok' : 'skipped'
}

function suiteResult(suite: VerificationTestSuite): TestResultLike {
  const summary = {
    total: suite.tests,
    passed: suite.passed,
    failed: suite.failed,
    skipped: suite.skipped,
    durationMs: suite.durationMs ?? null,
  }
  return {
    filePath: suite.module
      ? `${suite.module}${TEST_SUITE_MODULE_SEPARATOR}${suite.name}`
      : suite.name,
    status: statusOf(summary),
    summary,
    failures: (suite.failures ?? []).map((f) => ({
      testName: terminalPlainText(f.name),
      ...(f.message ? { message: terminalPlainText(f.message) } : {}),
    })),
    passes: [],
    skips: [],
  }
}

/** The failures the runner wrote as `<file> › <test>`, one result per file — never unstructured output. */
function failureResults(failures: readonly TestFailure[], unnamedFile: string): TestResultLike[] {
  const byFile = new Map<string, TestFailure[]>()
  for (const failure of failures) {
    byFile.set(failure.path, [...(byFile.get(failure.path) ?? []), failure])
  }
  return [...byFile].map(([path, mine]) => ({
    filePath: path || unnamedFile,
    status: 'fail',
    summary: { total: mine.length, passed: 0, failed: mine.length, skipped: 0 },
    failures: mine.map((f) => ({
      testName: terminalPlainText(f.name),
      ...(f.message ? { message: terminalPlainText(f.message) } : {}),
    })),
    passes: [],
    skips: [],
  }))
}

function sumSuites(suites: readonly VerificationTestSuite[]): TestCounts {
  return suites.reduce(
    (acc, s) => ({
      total: acc.total + s.tests,
      passed: acc.passed + s.passed,
      failed: acc.failed + s.failed,
      skipped: acc.skipped + s.skipped,
    }),
    { total: 0, passed: 0, failed: 0, skipped: 0 },
  )
}

function omittedLabel(omitted: number | undefined): string | undefined {
  return omitted && omitted > 0
    ? `${omitted} more suite${omitted === 1 ? '' : 's'} not kept`
    : undefined
}

/**
 * A test check's run as the Tests display reads it: each suite the record kept
 * (module › name, its counts and time, its failing tests with their messages),
 * else each failing test the runner named, grouped by file. A record that kept
 * no suites says so in `unrecordedNote` — its totals are the check's own to
 * show, never restated as a one-row group. `undefined` for a check that counted
 * no test and named none — its output is all there is.
 */
export function checkTestResults(check: TestResultsSource): CheckTestResults | undefined {
  const suites = check.testSuites ?? []
  const failures =
    check.status === 'passed' ? [] : parseTestFailures(check.details).filter((f) => f.name)
  const counted = checkTestCounts(check)
  if (suites.length > 0) {
    const summary = { ...(counted ?? sumSuites(suites)), durationMs: check.durationMs }
    return {
      results: {
        status: check.status === 'error' ? 'error' : statusOf(summary),
        summary,
        tests: suites.map(suiteResult),
      },
      omittedLabel: omittedLabel(check.testSuitesOmitted),
      unrecordedNote: undefined,
    }
  }
  if (failures.length > 0) {
    const counts = counted ?? {
      total: failures.length,
      passed: 0,
      failed: failures.length,
      skipped: 0,
    }
    const summary = { ...counts, durationMs: check.durationMs }
    return {
      results: {
        status: check.status === 'error' ? 'error' : statusOf(summary),
        summary,
        tests: failureResults(failures, check.label),
      },
      omittedLabel: undefined,
      unrecordedNote: TEST_SUITES_NOT_RECORDED_FAILURES,
    }
  }
  if (!counted || counted.total === 0) return undefined
  return {
    results: undefined,
    omittedLabel: undefined,
    unrecordedNote: TEST_SUITES_NOT_RECORDED_TOTALS,
  }
}
