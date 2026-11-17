import type { ProcessRetryPick, ProcessWaitingView } from 'thefactory-ui/headless'

/** Current, the same pick as `/?scene=retry-definitions&state=current`. */
export const WAITING_RETRY_PICK: ProcessRetryPick = { definitions: 'current' }

/** A reviewer stopped, with Try again as the answer an own note goes with. */
export const WAITING_RETRY_VIEW: ProcessWaitingView = {
  kind: 'blocker',
  heading: 'The reviewer is blocked',
  title: 'A newer reviewer is offered',
  words: 'Trying again can run this run’s versions, or the current ones.',
  details: [],
  transcriptLabel: 'Open the reviewer’s transcript →',
  choices: [
    {
      choice: 'retry',
      label: 'Try again',
      detail: 'Run this step again.',
      primary: true,
    },
  ],
}
