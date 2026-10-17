import type { ProofKind, ProofKindStatus } from 'thefactory-tools/types'

import type { StoryStepTone } from './storySignoffTypes'

/** What a person picks when changing what proves a feature at a stop, before sending it. */
export interface ProofChangeDraft {
  kinds: ProofKind[]
  /** Also write it onto the feature, so later runs start from it. */
  save: boolean
  /** Why, in their words. */
  note: string
}

/** One kind of proof as the change offers it. */
export interface ProofChangeKindView {
  kind: ProofKind
  label: string
  /** What it asks for, in one plain line. */
  meaning: string
  checked: boolean
  /** How it stood when the step stopped, for a kind the feature needed. */
  standing?: { status: ProofKindStatus; word: string; tone: StoryStepTone; detail: string }
  /** Why the run cannot produce it here. */
  unavailable?: string
  /** It cannot be picked: the run cannot produce it, and the feature did not already need it. */
  disabled: boolean
}

/** A change of what proves the work, as the stop's editor shows it. */
export interface ProofChangeView {
  /** The feature it changes; absent on a story's fix, whose change request it changes. */
  featureId?: string
  kinds: ProofChangeKindView[]
  /** The line under the heading: for this run only, and whether it can be saved. */
  hint: string
  /** It can be saved onto the feature: the run works one. */
  canSave: boolean
  save: boolean
  note: string
  /** Why it cannot be sent as it stands. */
  problem?: string
  canSend: boolean
}
