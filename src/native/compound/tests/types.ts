// Structural types the native test-view compounds consume. Mirrors the web
// peer field-for-field. Both renderers consume the OpenAPI surface stripped
// of cross-cutting tool deps — duplicated here so the native layer stays
// independent of `src/web/`.

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
