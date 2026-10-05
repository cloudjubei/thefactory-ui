import type { ProofKindStatus, ProofPlanSource } from 'thefactory-tools/types'

import type { StoryStepTone } from './storySignoffTypes'

/** What the launch approval asks, above each feature's proof plan. */
export const PROOF_PLAN_CONFIRM_HEADING = 'How each feature is proven'

/** Said under the heading: whose decision the plan was, and what confirming does. */
export const PROOF_PLAN_CONFIRM_DETAIL =
  'Whoever asked for each feature decided what proves it. Confirm it, or add what you would want to see.'

/** Where a plan came from, as the launch says it. */
export const PROOF_PLAN_SOURCE_LABELS: Record<ProofPlanSource, string> = {
  feature: 'Set on the feature',
  story: 'From the story',
  suggested: 'Suggested — the feature has no plan',
}

/** Said beside a plan the person changed on this launch. */
export const PROOF_PLAN_EDITED_LABEL = 'Changed for this run'

/** Said for a plan with no kind picked. */
export const PROOF_PLAN_EMPTY_LABEL =
  'Nothing picked — the run chooses how to prove it automatically.'

/** The choice to write the confirmed plans back onto the features. */
export const PROOF_PLAN_SAVE_LABEL = 'Save these plans to the features'

/** Said in place of the save choice when the features join an open run. */
export const PROOF_PLAN_EXTEND_NOTE =
  'Work added to an open run reads each feature’s own plan, so these are saved to the features.'

/** The heading over a feature's proof plan on its sign-off. */
export const PROOF_PLAN_SIGNOFF_HEADING = 'Proof plan'

/** The feature editor's label and hint for the plan. */
export const PROOF_PLAN_EDITOR_LABEL = 'Proof plan'
export const PROOF_PLAN_EDITOR_HINT =
  'How this change will be shown to be right. Pick what would convince you; the person starting the work confirms it.'
export const PROOF_PLAN_NOTES_PLACEHOLDER = 'What specifically must be shown — cases, screens, data'

/** Said under the editor when the feature has no plan of its own. */
export const PROOF_PLAN_INHERITS_PREFIX = 'Inherits the story’s plan:'
export const PROOF_PLAN_AUTOMATIC_LABEL =
  'No plan: the run chooses how to prove it from what the project can capture.'

/** Each standing in a word, as the sign-off says it. */
export const PROOF_KIND_STATUS_WORDS: Record<ProofKindStatus, string> = {
  met: 'Met',
  unmet: 'Not met',
  unchecked: 'Unchecked',
  pending: 'Not judged yet',
  'at-sign-off': 'Yours to check',
}

/** The tone each standing is drawn in. */
export const PROOF_KIND_STATUS_TONES: Record<ProofKindStatus, StoryStepTone> = {
  met: 'done',
  unmet: 'stuck',
  unchecked: 'review',
  pending: 'review',
  'at-sign-off': 'neutral',
}

/** How a field preview prints a plan that was cleared. */
export const PROOF_PLAN_CLEARED_TEXT = '(no plan — the run chooses automatically)'

/** How a field preview introduces a plan's notes. */
export const PROOF_PLAN_NOTES_PREFIX = 'What must be shown:'
