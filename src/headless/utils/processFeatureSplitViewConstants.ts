/** The split editor's heading. */
export const FEATURE_SPLIT_HEADING = 'Move to a follow-up'

/** The line under the heading. */
export const FEATURE_SPLIT_HINT =
  'Pick the points that can wait. They become a new feature on the story; this step is judged on the rest.'

/** The follow-up title field's placeholder. */
export const FEATURE_SPLIT_TITLE_PLACEHOLDER = 'Follow-up title'

/** The switch that opens the proof editor. */
export const FEATURE_SPLIT_CHANGE_PROOF_LABEL = 'Change the proof too'

/** The why field's placeholder. */
export const FEATURE_SPLIT_NOTE_PLACEHOLDER = 'Why (optional)'

/** The send button. */
export const FEATURE_SPLIT_SEND_LABEL = 'Move them'

/** The cancel button. */
export const FEATURE_SPLIT_CANCEL_LABEL = 'Cancel'

/** What the editor asks for before any point is picked. */
export const FEATURE_SPLIT_PICK_POINTS = 'Pick at least one point to move.'

/** How many points move and how many stay. */
export const FEATURE_SPLIT_COUNT = (moving: number, staying: number): string =>
  `${moving} move · ${staying} stay`

/** The chip on a point that moves, in the row look. */
export const FEATURE_SPLIT_MOVES_CHIP = 'Moves'

/** The chip on a point that stays, in the row look. */
export const FEATURE_SPLIT_STAYS_CHIP = 'Stays'
