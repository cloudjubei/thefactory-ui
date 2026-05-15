// Structural types the Tests-view components consume. Mirrors the domain
// shapes from `thefactory-tools` (`TestsResult`, `CoverageResult`, etc.)
// but stays in this package so consumers don't need a hard dep on the
// tools package — both web and desktop already produce data in this shape.

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

export type CoverageFileStatsLike = {
  pct_lines: number
  pct_statements: number
  // OpenAPI surfaces these as `unknown` because the backend forwards optional
  // tool-specific metrics — narrow at the call site via `typeof === 'number'`.
  pct_branch: number | null | unknown
  pct_functions: number | null | unknown
  uncovered_lines: number[]
}

export type CoverageResultLike = {
  status: 'ok' | 'error'
  message?: string
  summary?: {
    pct_lines: number
    pct_statements: number
    pct_branch: number | null | unknown
    pct_functions: number | null | unknown
  }
  files: Record<string, CoverageFileStatsLike>
  ignored_files?: string[]
}
