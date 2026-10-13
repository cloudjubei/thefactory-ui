import {
  PROCESS_MANAGER_MAX_PER_SIGNATURE,
  PROCESS_MANAGER_MAX_PER_STEP,
} from 'thefactory-tools/constants'
import type {
  ProcessManagerBriefCard,
  ProcessManagerInterventionOutcome,
} from 'thefactory-tools/types'

export const MANAGER_BRIEF_MODE_LABELS: Record<ProcessManagerBriefCard['mode'], string> = {
  triage: 'Triage',
  diagnose: 'Diagnose',
  'pre-read': 'Pre-read',
}

/** The brief in one line, by what the turn is for. */
export const MANAGER_BRIEF_LINES: Record<
  ProcessManagerBriefCard['mode'],
  (stepName: string) => string
> = {
  triage: (step) => `${step} stopped — settle it if you can.`,
  diagnose: (step) => `${step} stopped — find the cause and hand it on.`,
  'pre-read': () => 'Read the change, checks and review; file a short pre-read. Never decide.',
}

/** The line between turns, by what the turn is for. */
export const MANAGER_STOP_LINE = (
  mode: ProcessManagerBriefCard['mode'],
  stepName: string,
): string => (mode === 'pre-read' ? `${stepName} waits for you` : `${stepName} stopped`)

export const MANAGER_BRIEF_TO_AGENT = 'Manager → agent'
export const MANAGER_BRIEF_STOPPED = 'What stopped'
export const MANAGER_BRIEF_ANSWERS = 'Answers it takes'
export const MANAGER_BRIEF_TRIED = 'Tried so far'
export const MANAGER_BRIEF_TRIED_NOTHING = 'Nothing yet on this step.'
export const MANAGER_BRIEF_TRIES = (used: number, most: number): string => `${used} of ${most}`
export const MANAGER_BRIEF_LIMITS = `at most ${PROCESS_MANAGER_MAX_PER_SIGNATURE} on one problem, ${PROCESS_MANAGER_MAX_PER_STEP} on one step`
export const MANAGER_BRIEF_SHOW_WORDS = 'Show the brief as the agent got it'
export const MANAGER_BRIEF_HIDE_WORDS = 'Hide the brief as the agent got it'

export const MANAGER_OUTCOME_HANDLED = 'Handled'
export const MANAGER_OUTCOME_NEEDS_YOU = (n: number): string =>
  n === 1 ? '1 needs you' : `${n} need you`
export const MANAGER_OUTCOME_WHY = 'Why:'
export const MANAGER_OUTCOME_STILL_OPEN = 'Still open'
export const MANAGER_OUTCOME_DID = 'Did:'
export const MANAGER_OUTCOME_SHOW_WORDS = 'The agent’s own words'
export const MANAGER_OUTCOME_HIDE_WORDS = 'Hide the agent’s own words'
export const MANAGER_OUTCOME_PRE_READ = 'Filed the sign-off pre-read'
export const MANAGER_OUTCOME_PRE_READ_TOOL = 'fileSignOffPreRead'
export const MANAGER_OUTCOME_ON_STEP = (tool: string, stepName: string): string =>
  `${tool} on ${stepName}`
export const MANAGER_OUTCOME_RECOMMENDED = (finding: string, recommendation: string): string =>
  `${finding} Recommended: ${recommendation}`

export const MANAGER_ESCALATION_TITLE = 'The manager needs you'
export const MANAGER_ESCALATION_FOUND = 'What it found:'
export const MANAGER_ESCALATION_TRIED = 'What it tried:'
export const MANAGER_ESCALATION_RECOMMENDS = 'It recommends:'

/** The line closing a manager card replaced, on the same park, by a newer one. */
export const MANAGER_CARD_SUPERSEDED_NEWER = 'Superseded — the manager raised a newer card'

/** The pill of an intervention, by how it came out since. */
export const MANAGER_OUTCOME_PILLS: Record<ProcessManagerInterventionOutcome, string> = {
  pending: MANAGER_OUTCOME_HANDLED,
  settled: 'Settled',
  failed: 'Did not help',
  reversed: 'You undid it',
}

export const MANAGER_OUTCOME_RESULT = 'Result:'
export const MANAGER_OUTCOME_LEFT_YOU = 'What it left you'
export const MANAGER_ESCALATION_SHOW_DETAIL = 'What the manager found'
export const MANAGER_ESCALATION_HIDE_DETAIL = 'Hide what the manager found'
