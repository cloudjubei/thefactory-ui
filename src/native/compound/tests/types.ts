// Structural types the native test-view compounds consume. The test-run
// shapes are shared with the web peer from `headless/utils/testResultsTypes`.

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
