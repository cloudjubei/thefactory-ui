/** Delete control on a plain (API-shaped) message — one stored message goes. */
export const MESSAGE_DELETE_LABEL = 'Delete last message'

/** Same control while a turn streams: it refuses, and says why. */
export const MESSAGE_DELETE_BUSY_LABEL = 'Wait for the turn to finish before deleting'

/**
 * Delete control on a CLI turn. The steps above it are read from the run record,
 * not stored as messages, so removing the one message that owns the run removes
 * the whole turn — the label says so rather than implying a single row goes.
 */
export const CLI_TURN_DELETE_LABEL = 'Delete this agent turn — its whole run goes with it'

/** Same control while that run is still going. */
export const CLI_TURN_DELETE_RUNNING_LABEL = 'Stop the run before deleting this turn'

/** Short visible caption next to the icon on the CLI turn control. */
export const CLI_TURN_DELETE_ACTION_LABEL = 'Delete turn'
