import type { VerificationCheckResult } from '../api/generated'
import { TEST_SUITE_MARKS, TEST_SUITE_NO_TESTS } from './testSuitesConstants'
import type { TestSuiteOutcome, TestSuitesView } from './testSuitesTypes'
import { formatDurationMs } from './time'

/**
 * A check's suites as the Tests tab lists them — module, name, the counts that
 * are not zero, time, and the failing tests with their messages — or
 * `undefined` when the record kept none (its reports were not read, or it
 * predates them).
 */
export function testSuitesView(
  check: Pick<VerificationCheckResult, 'testSuites' | 'testSuitesOmitted'>,
): TestSuitesView | undefined {
  const suites = check.testSuites ?? []
  if (suites.length === 0) return undefined
  const rows = suites.map((suite, index) => {
    const outcome: TestSuiteOutcome =
      suite.failed > 0 ? 'failed' : suite.passed > 0 ? 'passed' : 'skipped'
    const counts = [
      suite.passed > 0 ? `${suite.passed} passed` : undefined,
      suite.failed > 0 ? `${suite.failed} failed` : undefined,
      suite.skipped > 0 ? `${suite.skipped} skipped` : undefined,
    ].filter((part): part is string => part !== undefined)
    return {
      key: `${suite.module ?? ''}:${suite.name}:${index}`,
      module: suite.module,
      name: suite.name,
      countsLabel: counts.length > 0 ? counts.join(' · ') : TEST_SUITE_NO_TESTS,
      outcome,
      mark: TEST_SUITE_MARKS[outcome],
      durationLabel:
        suite.durationMs !== undefined ? formatDurationMs(suite.durationMs) : undefined,
      failures: (suite.failures ?? []).map((f) => ({
        path: '',
        name: f.name,
        message: f.message ?? '',
      })),
    }
  })
  const omitted = check.testSuitesOmitted ?? 0
  return {
    rows,
    omittedLabel:
      omitted > 0 ? `${omitted} more suite${omitted === 1 ? '' : 's'} not kept` : undefined,
  }
}
