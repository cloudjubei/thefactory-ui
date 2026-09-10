/** One failing test, split out of a check's raw output. */
export type TestFailure = {
  /** The file the test lives in. */
  path: string
  /** The test's own name. */
  name: string
  /** The assertion message, as the runner printed it. */
  message: string
}

/**
 * Split a test check's `details` into its individual failures.
 *
 * PAIRED with the formatter in thefactory-tools (`src/checkRunner/
 * checkRunnerHelpers.ts`), which joins failures with a blank line and writes
 * each as `"<filePath> › <testName>\n<message>"`. Anything that does not match
 * that shape is returned as a message-only entry rather than dropped — raw
 * output a reviewer cannot see is worse than output that is merely unstructured.
 */
export function parseTestFailures(details: string | undefined): TestFailure[] {
  const text = details?.trim()
  if (!text) return []
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => {
      const newline = block.indexOf('\n')
      const head = newline === -1 ? block : block.slice(0, newline)
      const message = newline === -1 ? '' : block.slice(newline + 1).trim()
      const sep = head.indexOf('›')
      if (sep === -1) return { path: '', name: '', message: block }
      return {
        path: head.slice(0, sep).trim(),
        name: head.slice(sep + 1).trim(),
        message,
      }
    })
}
