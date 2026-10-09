/** The word after a reworked feature's number. */
export const RUN_PENDING_CHANGE_REWORKED = 'reworked'

/** The word after an added feature's number. */
export const RUN_PENDING_CHANGE_ADDED = 'added'

/** How a step waiting to run again is named. */
export const RUN_PENDING_CHANGE_RERUN = (step: string): string => `Re-run ${step}`

/** What starting does, and why approving waits, when the changes can start. */
export const RUN_PENDING_CHANGES_START_HINT =
  'Nothing has started. Starting takes the run off its sign-off and works every change in one pass, then asks for sign-off again. Approving waits until they start or are removed.'

/** The ✕ on a waiting change. */
export const RUN_PENDING_CHANGE_REMOVE_LABEL = 'Remove this change — the story keeps its edit'
