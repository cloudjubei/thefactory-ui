// Web-only Tailwind class producers, plus a re-export of the logical helpers
// that now live in `headless/utils/testsFormat.ts` so the native peer can share
// the same code paths.

export {
  COVERAGE_IMPROVE_THRESHOLD,
  TEST_CONFIG_PATTERN,
  coverageBucket,
  formatUncoveredLines,
  getDirname,
  getFilename,
  isTestConfigPath,
  msToShort,
  normalizeRel,
  type CoverageBucket,
} from '../../../headless/utils/testsFormat'

import { coverageBucket } from '../../../headless/utils/testsFormat'

/** Tailwind text-colour class for a coverage percentage. */
export function pctColorClass(p: number): string {
  switch (coverageBucket(p)) {
    case 'good':
      return 'text-green-700 dark:text-green-300'
    case 'warn':
      return 'text-amber-700 dark:text-amber-300'
    case 'poor':
      return 'text-orange-700 dark:text-orange-300'
    case 'bad':
      return 'text-red-700 dark:text-red-300'
  }
}

/** Tailwind bar-fill class for a coverage percentage. */
export function pctBarClass(p: number): string {
  switch (coverageBucket(p)) {
    case 'good':
      return 'bg-green-500'
    case 'warn':
      return 'bg-amber-500'
    case 'poor':
      return 'bg-orange-500'
    case 'bad':
      return 'bg-red-500'
  }
}
