import type { LaunchSuggestionRow } from './workLaunchViewTypes'

/** What each suggested setting is called on the launch card. */
export const LAUNCH_SUGGESTION_LABELS: Record<LaunchSuggestionRow['key'], string> = {
  processId: 'Process',
  featureProcessId: 'Features worked by',
  proofKinds: 'Proof',
  codeReview: 'Code review',
  turnLimit: 'Turn limit',
  model: 'Model',
  baseBranch: 'Branch',
}

/** The launch card's action that asks an agent for the best setup. */
export const LAUNCH_SUGGEST_LABEL = 'Suggest setup'

/** While the agent looks the work over. */
export const LAUNCH_SUGGEST_BUSY = 'Looking at the work…'

/** Applying what the agent suggested. */
export const LAUNCH_SUGGEST_APPLY = 'Use these'

/** Leaving the suggestion. */
export const LAUNCH_SUGGEST_DISMISS = 'Dismiss'

/** Heading of the choice between a process run and a chat. */
export const WORK_LAUNCH_HEADING = 'Start work'

/** The words for a feature process the person may pick. */
export const FEATURE_PROCESS_WORDS: Record<string, string> = {
  'feature-default': 'Developer, then verifier',
  'feature-self-verified': 'One agent',
}
