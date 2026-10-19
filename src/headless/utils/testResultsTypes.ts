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

/** A test file the run could not finish, as the Tests display lists it. */
export type UnfinishedTestFileView = {
  path: string
  /** Why it stopped, in words: "stopped after 30 s", "crashed: SyntaxError …". */
  reason: string
  /** Its time limit stopped it. */
  stopped: boolean
  /** The last lines it printed, when it printed any. */
  outputTail: string | undefined
}

/** The files a test run could not finish, and the files that did, as one passed row. */
export type UnfinishedTestsView = {
  files: UnfinishedTestFileView[]
  /** The files that finished — absent when none did. */
  finished:
    | {
        /** Their names, "McpServer.test.ts · ToolLoopDetector.test.ts", or "The other 2 files". */
        label: string
        /** "132 tests". */
        countLabel: string
        files: number
        passed: number
        /** Their suites are listed with the run — the passed row would say it twice. */
        listed: boolean
      }
    | undefined
}

/** A check's test run, as the Tests display reads it. */
export type CheckTestResults = {
  /** Its suites, or the failing tests its output named; absent when the record kept neither. */
  results: TestsResultLike | undefined
  /** "12 more suites not kept" — the suites the record left out to stay bounded. */
  omittedLabel: string | undefined
  /** Why no suites are listed — the record predates suite capture or could not read them. */
  unrecordedNote: string | undefined
  /** The files it could not finish — set only when its record named them. */
  unfinished: UnfinishedTestsView | undefined
}
