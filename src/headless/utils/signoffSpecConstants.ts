/** The story spec card's checklist chip, which opens every feature's acceptance criteria. */
export const SIGNOFF_SPEC_CRITERIA_CHIP = 'Acceptance criteria'

/** What each feature's criteria are headed beside its chip. */
export const SIGNOFF_SPEC_CRITERIA_CAPTION = 'acceptance'

/** How many lines the story's description shows before it is clamped. */
export const SIGNOFF_SPEC_DESCRIPTION_LINES = 3

export const SIGNOFF_SPEC_DESCRIPTION_TOGGLE = {
  more: 'Show the whole description',
  less: 'Show less',
} as const

/** What a run moved out of a feature into a follow-up, as the spec card says it under the feature. */
export const SIGNOFF_SPEC_MOVED = (title: string, points: readonly string[]): string =>
  `Moved to “${title}”: ${points.join('; ')}`
