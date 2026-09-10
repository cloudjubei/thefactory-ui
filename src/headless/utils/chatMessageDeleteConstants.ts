/** Delete control on a plain (API-shaped) message — one stored message goes. */
export const MESSAGE_DELETE_LABEL = 'Delete last message'

/**
 * Delete control on a CLI turn. The steps above it are read from the run record,
 * not stored as messages, so removing the one message that owns the run removes
 * the whole turn — the label says so rather than implying a single row goes.
 */
export const CLI_TURN_DELETE_LABEL = 'Delete this agent turn — its whole run goes with it'

/** Short visible caption next to the icon on the CLI turn control. */
export const CLI_TURN_DELETE_ACTION_LABEL = 'Delete turn'

/**
 * The chat's history is closed and deliberately kept. Shown INSTEAD of hiding the
 * control: the record of how the work happened is the valuable part, and a
 * missing button reads as a bug rather than a decision.
 */
export const HISTORY_LOCKED_LABEL = 'This chat is closed — its history is kept and cannot be edited'

/** One turn whose work was signed off. Removing it would orphan the approval that points at it. */
export const SIGNED_OFF_TURN_LOCKED_LABEL =
  'This turn was signed off — its history is kept and cannot be removed'
