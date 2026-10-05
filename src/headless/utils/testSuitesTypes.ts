import type { TestFailure } from './testFailures'

/** How one suite came out: any failing test fails it, a suite that ran nothing is skipped. */
export type TestSuiteOutcome = 'passed' | 'failed' | 'skipped'

/** One test suite of a check — for JVM tests, one test class — as the Tests tab lists it. */
export type TestSuiteRow = {
  key: string
  /** The build module whose suite it is (`app`, `core/data`), when the record says. */
  module: string | undefined
  /** The suite's own name, e.g. `com.acme.LoginTest`. */
  name: string
  /** "3 passed · 1 failed · 1 skipped", only the counts that are not zero; "no tests" for none. */
  countsLabel: string
  outcome: TestSuiteOutcome
  /** ✓ ✗ ○ */
  mark: string
  durationLabel: string | undefined
  /** Its failing tests, each with its message. */
  failures: TestFailure[]
}

/** A check's suites, as the Tests tab lists them. */
export type TestSuitesView = {
  rows: TestSuiteRow[]
  /** "12 more suites not kept" — the suites the record left out to stay bounded. */
  omittedLabel: string | undefined
}
