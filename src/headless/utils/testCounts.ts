/** How many individual tests a run's test checks account for. */
export type TestCounts = {
  passed: number
  failed: number
  skipped: number
  total: number
}

/**
 * Read the per-test tallies out of a test check's one-line summary.
 *
 * PAIRED with the formatter in thefactory-tools (`src/checkRunner/
 * checkRunnerHelpers.ts`), which writes `"128/132 passed, 1 failed, 3 skipped"`.
 * There is no structured count on `VerificationCheckResult`, so this string is
 * the only place the numbers exist — change the formatter and change this.
 *
 * Returns `undefined` rather than guessing when the shape is not recognised: a
 * missing badge is honest, a wrong number is not.
 */
export function parseTestCounts(summary: string): TestCounts | undefined {
  const head = /(\d+)\s*\/\s*(\d+)\s+passed/.exec(summary)
  if (!head) return undefined
  const passed = Number(head[1])
  const total = Number(head[2])
  if (!Number.isFinite(passed) || !Number.isFinite(total)) return undefined
  const failed = Number(/(\d+)\s+failed/.exec(summary)?.[1] ?? 0)
  const skipped = Number(/(\d+)\s+skipped/.exec(summary)?.[1] ?? 0)
  return { passed, failed, skipped, total }
}

/**
 * The run's test tallies across every test layer, or `undefined` when no layer
 * reported a countable summary.
 */
export function aggregateTestCounts(summaries: readonly string[]): TestCounts | undefined {
  const parsed = summaries.map(parseTestCounts).filter((c): c is TestCounts => c !== undefined)
  if (parsed.length === 0) return undefined
  return parsed.reduce(
    (acc, c) => ({
      passed: acc.passed + c.passed,
      failed: acc.failed + c.failed,
      skipped: acc.skipped + c.skipped,
      total: acc.total + c.total,
    }),
    { passed: 0, failed: 0, skipped: 0, total: 0 },
  )
}
