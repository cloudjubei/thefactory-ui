/** Up to this many steps show in full on a wide strip; more fold into chips. */
export const STEPS_STRIP_FULL_MAX = 6

/** The heading each kind of strip carries. */
export const STEPS_STRIP_LABELS = {
  steps: 'Steps',
  features: 'Features',
  doneWhen: 'Done when',
} as const

/** What the folded chips and the full list say. */
export const STEPS_STRIP_COPY = {
  listTitle: 'All steps',
  openList: 'Show every step',
  closeList: 'Close the list',
} as const
