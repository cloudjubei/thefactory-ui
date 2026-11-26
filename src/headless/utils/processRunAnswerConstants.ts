import type { ProcessResumeChoice } from 'thefactory-tools/types'

/**
 * The answers after which a run goes on from the step it stopped at. Every
 * other answer may end the run or decide where it goes next, so nothing is
 * assumed of the run until the host says.
 */
export const PROCESS_ANSWER_CONTINUES: ReadonlySet<ProcessResumeChoice> = new Set([
  'continue',
  'retry',
  'allow',
  'allow-site',
  'resolved',
  'more-info',
  'update-base',
  'resolve-base-conflict',
  'send-to-developer',
  'recheck',
  'recapture',
  'accept-dropped-change',
])

/** What the stop's card says while an answer is on its way, by its choice. */
export const PROCESS_ANSWER_PENDING_LINES: Partial<Record<ProcessResumeChoice, string>> = {
  retry: 'Trying again…',
  recheck: 'Checking again…',
  recapture: 'Capturing again…',
  abandon: 'Stopping the run…',
  'close-unmerged': 'Closing the run…',
  approve: 'Approving…',
  'accept-with-follow-ups': 'Approving…',
  reject: 'Rejecting…',
  'request-changes': 'Sending it back…',
  'send-to-developer': 'Sending it to the developer…',
  'resolve-base-conflict': 'Sending the conflict to a developer…',
  'more-info': 'Sending your answer…',
  resolved: 'Sending your answer…',
  allow: 'Allowing it…',
  'allow-site': 'Allowing it…',
  'change-proof': 'Changing the proof…',
  'split-follow-up': 'Moving the points…',
  'accept-dropped-change': 'Recording your answer…',
}

/** What the card says while the base branch is brought in. */
export const PROCESS_ANSWER_PENDING_BASE = (base: string) => `Bringing ${base} in…`

/** The base branch's name when the run has none to show. */
export const PROCESS_ANSWER_PENDING_BASE_UNNAMED = 'the base'

/** What the card says for an answer with no words of its own. */
export const PROCESS_ANSWER_PENDING_FALLBACK = 'Carrying on…'
