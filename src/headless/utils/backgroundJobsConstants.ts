/** The result type a tool row takes when its call carries on as a background job. */
export const BACKGROUND_TOOL_RESULT_TYPE = 'background'

/** What a tool row says while its call carries on in the background. */
export const BACKGROUND_TOOL_LABEL = 'In background'

/** Heading of the row that shows results of calls that finished in the background. */
export const BACKGROUND_RESULTS_TITLE = 'Background results'

/** What the jump from a result back to its call says. */
export const BACKGROUND_RESULT_JUMP_LABEL = 'Go to the call'

/** How long a call runs before its row says where it is waiting, and for how long. */
export const TOOL_SLOW_AFTER_MS = 10_000

/** What a slow call waiting on one of the host's own tools says. */
export const TOOL_WAITING_ON_HOST_LABEL = 'Waiting on host'

/** What a slow call the CLI runs itself says. */
export const TOOL_RUNNING_LABEL = 'Running'

/** How often a running call's row refreshes how long it has been waiting. */
export const TOOL_SLOW_TICK_MS = 1_000
