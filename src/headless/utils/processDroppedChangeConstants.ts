import type { ProcessDroppedChangeWho } from 'thefactory-tools/types'

/** What the run's record of changes dropped on purpose is called. */
export const PROCESS_DROPPED_CHANGE_LABEL = 'Dropped on purpose'

/** Who accepted a dropped change, as the person reads it. */
export const PROCESS_DROPPED_CHANGE_WHO: ProcessDroppedChangeWho = {
  person: 'You',
  agent: 'A chat agent, approved by you,',
}
