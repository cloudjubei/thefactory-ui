import type {
  VerificationBaselineVerdict,
  VerificationCheckRanIn,
  VerificationCheckStatus,
} from '../api/generated'
import { CHECK_CHIP_MARKS } from './checkMethodConstants'
import type { ProcessStatusTone } from './processView'

export const PROCESS_CHECK_MARKS: Record<VerificationCheckStatus, string> = {
  passed: '✓',
  failed: '✗',
  error: '!',
  skipped: '–',
}

export const PROCESS_CHECK_WORDS: Record<VerificationCheckStatus, string> = {
  passed: 'passed',
  failed: 'failed',
  error: 'didn’t finish',
  skipped: 'skipped',
}

/** A command that did not finish did not fail: amber, as its sign-off chip is. */
export const PROCESS_CHECK_TONES: Record<VerificationCheckStatus, ProcessStatusTone> = {
  passed: 'done',
  failed: 'stuck',
  error: 'working',
  skipped: 'empty',
}

/**
 * An advisory command's failure is reported, never a stop — so it never reads as
 * one: it is flagged, in the same amber and with the same mark as its sign-off chip.
 */
export const PROCESS_CHECK_ADVISORY_TONE: ProcessStatusTone = 'working'

export const PROCESS_CHECK_FLAGGED_MARK = CHECK_CHIP_MARKS.flagged

export const PROCESS_CHECK_FLAGGED_WORD = 'flagged'

export const PROCESS_CHECK_ADVISORY_LABEL = 'advisory'

/** The short word on a check row for where it ran. */
export const CHECK_RAN_IN_LABELS: Record<VerificationCheckRanIn, string> = {
  sandbox: 'sandbox',
  host: 'host',
}

/** The roles that change the code, and so are expected to run the project's checks first. */
export const DEVELOPER_CHECK_ROLES: readonly string[] = ['developer', 'fixer', 'developer-verifier']

export const DEVELOPER_VERIFIED_LABEL = 'Developer verified'

export const DEVELOPER_RAN_NO_CHECKS = 'Developer ran no checks'

/** The short word on a failed check row for how it compares with the change's base — only when it is not the change's alone. */
export const PROCESS_CHECK_BASELINE_LABELS: Partial<Record<VerificationBaselineVerdict, string>> = {
  'pre-existing': 'pre-existing',
  'partly-pre-existing': 'partly pre-existing',
}
