/** What finishing a run as already landed does, after where the work already is. */
export const PROCESS_ALREADY_LANDED_OFFER_DETAIL = (branch: string): string =>
  `Nothing is merged: its features are marked done, the work branch ${branch} is removed and the run moves to History.`

/** Heads the features finishing marks done. */
export const PROCESS_ALREADY_LANDED_FEATURES_HEAD = 'Its features'

/** How a feature finishing leaves as it is reads. */
export const PROCESS_ALREADY_LANDED_FEATURE_STAYS = 'stays as it is'

/** How a feature finishing makes done reads. */
export const PROCESS_ALREADY_LANDED_FEATURE_DONE = 'becomes done'
