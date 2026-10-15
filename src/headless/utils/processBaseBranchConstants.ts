/** The chip's name for the branch a launch works off. */
export const BASE_BRANCH_LABEL = 'Branch'

/** The mark on the branch the project's checkout is on. */
export const BASE_BRANCH_CURRENT_TAG = 'Current'

/** Heads the branches past the usual ones. */
export const BASE_BRANCH_OTHERS_HEADING = 'Other branches'

/** Said under the branches: what working off one means. */
export const BASE_BRANCH_NOTE =
  'The work starts from this branch and goes back into it when you approve.'

/** Said in place of the choice when the work joins, or builds on, a run's open work. */
export const BASE_BRANCH_FOLLOWS_OPEN_RUN = 'Same branch as that run'

/** Said when the agent asked to work off a branch the project does not have. */
export const BASE_BRANCH_ASKED_MISSING = (branch: string): string =>
  `The agent asked for ${branch}, which this project does not have.`
