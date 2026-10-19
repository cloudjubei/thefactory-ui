/** Where a suite's module and its name meet, in the name the Tests display lists it under. */
export const TEST_SUITE_MODULE_SEPARATOR = ' › '

/** What a test run that kept no suites says in their place — its totals are all the record has. */
export const TEST_SUITES_NOT_RECORDED_TOTALS =
  'Suites weren’t recorded for this run — only its totals were kept.'

/** The same, for a run whose output named its failing tests. */
export const TEST_SUITES_NOT_RECORDED_FAILURES =
  'Suites weren’t recorded for this run — only the failing tests its output named.'

/** Between the names of the files that finished, in a run that left others unfinished. */
export const UNFINISHED_SUITE_SEPARATOR = ' · '

/** The files that finished, when the record kept no suite to name them by. */
export const UNFINISHED_OTHER_FILES = (n: number): string =>
  n === 1 ? 'The other file' : `The other ${n} files`

/** How many tests passed in the files that finished. */
export const UNFINISHED_PASSED_TESTS = (n: number): string => `${n} ${n === 1 ? 'test' : 'tests'}`

/** Leads the row of a test file that did not finish. */
export const UNFINISHED_FILE_WORD = 'Didn’t finish'

/** Leads the row of the files that finished, in a run that left others unfinished. */
export const FINISHED_FILES_WORD = 'Passed'
