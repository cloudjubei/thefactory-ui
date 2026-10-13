import type { CoverageResult, TestsResult } from '../api'

/** What only the Tests screen shows: the test list, the last custom run and the last coverage. */
export type TestsDetail = {
  available: string[]
  lastCustomRun: TestsResult | null
  lastCoverage: CoverageResult | null
}

/** A project's tests as last read: the last run (what a badge reads), and the detail once read. */
export type TestsBundle = {
  lastRun: TestsResult | null
  detail: TestsDetail | null
}
