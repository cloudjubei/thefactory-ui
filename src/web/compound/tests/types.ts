// Structural types the Tests-view components consume. Mirrors the domain
// shapes from `thefactory-tools` (`TestsResult`, `CoverageResult`, etc.); the
// test-run shapes are shared with the native peer from `headless/utils/testResultsTypes`.

export type {
  TestFailureLike,
  TestNameLike,
  TestResultLike,
  TestStatusLike,
  TestSummaryLike,
  TestsResultLike,
} from '../../../headless/utils/testResultsTypes'

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
