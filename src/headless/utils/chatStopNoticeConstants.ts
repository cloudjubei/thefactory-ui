import type { ChatStopCause } from './chatStopNoticeTypes'
import type { ProcessStatusTone } from './processView'

/** Copy for the card a stopped turn or story run shows. */
export const CHAT_STOP_COPY = {
  stoppedOn: (featureTitle: string) => `Stopped on “${featureTitle}”`,
  turnStopped: 'This turn stopped',
  turnsUsed: (limit: number) => `Used all ${limit} turns`,
  turnsUsedUnknown: 'Used all its turns',
  failedAgain: (times: number) => `Failed again — same cause (${times} times)`,
  tryAgain: 'Try again',
  carryOn: (turns: number) => `Carry on with ${turns} more turns`,
  carryOnUnknown: 'Carry on',
  askAgent: 'Ask the agent to fix it',
  openChanges: 'Open the changes',
  showDetails: 'Show details',
  hideDetails: 'Hide details',
  retryTitle: 'Retry the last action',
  draftOn: (featureTitle: string, reason: string) =>
    `The work on “${featureTitle}” stopped: ${reason} Please fix the cause, then carry on.`,
  draft: (reason: string) =>
    `Your last turn stopped: ${reason} Please fix the cause, then carry on.`,
}

/** Whose problem each cause names, and the tone it is drawn in. */
export const CHAT_STOP_CAUSE_PILL: Record<
  Exclude<ChatStopCause, 'turns'>,
  { label: string; tone: ProcessStatusTone }
> = {
  overseer: { label: 'Overseer fault — not the agent', tone: 'review' },
  provider: { label: 'The model provider failed', tone: 'review' },
  agent: { label: 'The agent’s work failed', tone: 'blocked' },
}

/** The tone of a stop that used all its turns: nothing failed. */
export const CHAT_STOP_TURNS_TONE: ProcessStatusTone = 'empty'

/** The tone of a stop whose cause this build does not know. */
export const CHAT_STOP_UNKNOWN_TONE: ProcessStatusTone = 'empty'

/** From how many stops in a row the card says it failed again. */
export const CHAT_STOP_REPEAT_FROM = 2
