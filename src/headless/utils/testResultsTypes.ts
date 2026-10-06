/**
 * The shapes the Tests display (`TestsAggregateBar`, `TestResultsList`, web and
 * native) reads. They mirror thefactory-tools' `TestsResult` structurally, so a
 * project's test run and a check's test results both render through it.
 */

export type TestStatusLike = 'ok' | 'fail' | 'error' | 'skipped'

export type TestFailureLike = {
  testName?: string
  message?: string
  line?: number | null
  column?: number | null
  stack?: string
}

export type TestNameLike = {
  testName: string
}

export type TestSummaryLike = {
  total: number
  passed: number
  failed: number
  skipped: number
  durationMs?: number | null
}

export type TestResultLike = {
  filePath: string
  status: TestStatusLike
  summary: TestSummaryLike
  failures: TestFailureLike[]
  passes: TestNameLike[]
  skips: TestNameLike[]
  rawText?: string
}

export type TestsResultLike = {
  status: TestStatusLike
  summary: TestSummaryLike
  tests: TestResultLike[]
}

/** A check's test run, as the Tests display reads it. */
export type CheckTestResults = {
  /** Its suites, or the failing tests its output named; absent when the record kept neither. */
  results: TestsResultLike | undefined
  /** "12 more suites not kept" — the suites the record left out to stay bounded. */
  omittedLabel: string | undefined
  /** Why no suites are listed — the record predates suite capture or could not read them. */
  unrecordedNote: string | undefined
}
