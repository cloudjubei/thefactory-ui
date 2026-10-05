import type { TestSuiteOutcome } from './testSuitesTypes'

/** The mark a suite row leads with, by how it came out. */
export const TEST_SUITE_MARKS: Record<TestSuiteOutcome, string> = {
  passed: '✓',
  failed: '✗',
  skipped: '○',
}

/** What a suite that ran no test says instead of counts. */
export const TEST_SUITE_NO_TESTS = 'no tests'
