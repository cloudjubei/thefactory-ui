import { msToShort } from './format'
import type { TestsResultLike } from './types'

export type TestsAggregateBarProps = {
  results: TestsResultLike | null
  /** Override the header line. Defaults to "All tests passed" / "Test run completed with failures". */
  title?: string
  /** Optional message rendered to the right of the counts (e.g. "Last run 2m ago"). */
  trailingNote?: string
}

export function TestsAggregateBar({ results, title, trailingNote }: TestsAggregateBarProps) {
  if (!results) return null
  const summary = results.summary
  const failed = summary?.failed ?? 0
  const hasFailures = failed > 0
  const dur = msToShort(summary?.durationMs)

  const headline = title ?? (hasFailures ? 'Test run completed with failures' : 'All tests passed')

  return (
    <div
      className={
        'rounded-md p-3 text-sm ' +
        (hasFailures
          ? 'border border-red-300/60 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-300'
          : 'border border-green-300/60 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 text-green-700 dark:text-green-300')
      }
    >
      <div className="font-medium">{headline}</div>
      <div className="text-xs opacity-80 mt-1 flex items-center gap-2 flex-wrap">
        <span className="text-green-700 dark:text-green-300">✓ {summary.passed}</span>
        <span className="text-red-700 dark:text-red-300">✗ {summary.failed}</span>
        <span className="text-amber-700 dark:text-amber-300">○ {summary.skipped}</span>
        <span className="text-neutral-600 dark:text-neutral-400">• {summary.total} total</span>
        {dur && <span className="text-neutral-600 dark:text-neutral-400">• {dur}</span>}
        {trailingNote && (
          <span className="ml-auto text-neutral-600 dark:text-neutral-400">{trailingNote}</span>
        )}
      </div>
    </div>
  )
}

export default TestsAggregateBar
