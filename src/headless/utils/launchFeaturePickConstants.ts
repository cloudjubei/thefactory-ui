/** A feature left out of the launch: it stays on the story for later. */
export const LAUNCH_FEATURE_LEFT_OUT = 'Not in this run'

/** The launch card with no feature picked. */
export const LAUNCH_FEATURE_PICK_NONE = 'Pick at least one feature to work.'

/** How many of the story's open features the launch works. */
export const launchFeaturePickCount = (picked: number, total: number): string =>
  picked === total ? `${total} feature${total === 1 ? '' : 's'}` : `${picked} of ${total} features`
