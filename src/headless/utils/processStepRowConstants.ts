import { PROCESS_ACCEPTED_UNCHECKED_NOTE } from './processAcceptedUncheckedConstants'
import type { ProcessNodeState } from './processView'
import { PROCESS_RUN_WORDS } from './processViewConstants'

/** How long a step's one-line result may run. */
export const PROCESS_STEP_RESULT_MAX = 60

export const PROCESS_STEP_WAITING_ON_YOU = PROCESS_RUN_WORDS.needsYou
export const PROCESS_STEP_MANAGER_ON_IT = PROCESS_RUN_WORDS.managerOnIt
export const PROCESS_STEP_NOT_NEEDED = 'Not needed — nothing was sent back'
export const PROCESS_STEP_SKIPPED = 'Skipped'
export const PROCESS_STEP_WORKING = 'Working…'

export const PROCESS_REVIEW_VERDICT_WORDS = {
  approved: 'Approved',
  'changes-requested': 'Changes requested',
  rejected: 'Rejected',
} as const

/** The mark a stage chip wears for where its step stands. */
export const PROCESS_STAGE_MARKS: Record<ProcessNodeState, string> = {
  done: '✓',
  accepted: '!',
  failed: '✗',
  parked: '?',
  working: '…',
  requeued: '↺',
  rechecked: '↷',
  queued: '',
  skipped: '–',
}

/** The word a stage chip says when nothing more specific does. */
export const PROCESS_STAGE_WORDS: Record<ProcessNodeState, string | undefined> = {
  done: undefined,
  accepted: PROCESS_ACCEPTED_UNCHECKED_NOTE,
  failed: 'did not pass',
  parked: PROCESS_RUN_WORDS.needsYou.toLowerCase(),
  working: 'running',
  requeued: 'next',
  rechecked: 'sent to checks',
  queued: undefined,
  skipped: 'skipped',
}

/** The word a stage chip says while the agent manager has the stop it is at. */
export const PROCESS_STAGE_MANAGER_ON_IT = PROCESS_RUN_WORDS.managerOnIt.toLowerCase()

/** How far after an attempt ended its filing may still land and count as its own. */
export const PROCESS_STEP_FILING_GRACE_MS = 120_000
