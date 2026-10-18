/** The project setting's label. */
export const PROJECT_STABLE_BRANCH_LABEL = 'Stable branch (optional)'

/** What the field shows while it is empty: the branch taken when none is set. */
export const PROJECT_STABLE_BRANCH_PLACEHOLDER = 'main'

/** What the setting is for. */
export const PROJECT_STABLE_BRANCH_HINT =
  'Other projects that build against this one are checked against this branch when its pending changes break them. Blank: main, else dev.'

/** Why a value cannot be saved. */
export const PROJECT_STABLE_BRANCH_INVALID = (value: string): string =>
  `“${value}” is not a valid branch name.`
