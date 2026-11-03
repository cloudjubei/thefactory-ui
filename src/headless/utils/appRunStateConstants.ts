/** What a run at its sign-off waits on the person for. */
export const APP_RUN_SIGN_OFF_ASK = 'Sign off'

/** What `overseer:run.read` is refused with when it names no run. */
export const APP_RUN_QUERY_INVALID = 'run.read needs a runId or a storyId.'

/** What `overseer:run.read` is refused with outside a project. */
export const APP_RUN_NO_PROJECT = 'No active project to read runs from.'

/** What `overseer:run.read` is refused with for a run of another project. */
export const APP_RUN_OTHER_PROJECT = 'That run is not in this project.'

/** What `overseer:run.read` is refused with when the run cannot be read. */
export const APP_RUN_READ_FAILED = 'Could not read the run.'

/** How deep `overseer:run.read` follows nested runs for the step a run is on. */
export const APP_RUN_NESTING_MAX = 3
