import type { ProofKind } from 'thefactory-tools/types'

import type { ProofChangeDraft, ProofChangeView } from './processProofChangeViewTypes'

/** What a person picks when moving part of a feature into a follow-up at a stop, before sending it. */
export interface FeatureSplitDraft {
  /** The points to move, by their index in the offer, in order. */
  moved: number[]
  /** The follow-up's title. */
  title: string
  /** Also change what proves the feature in the same answer. */
  changeProof: boolean
  /** What proves it from now on, while `changeProof`; absent where the stop offers no change of it. */
  proof?: ProofChangeDraft
  /** Why, in their words. */
  note: string
}

/** One acceptance point as the split shows it. */
export interface FeatureSplitPointView {
  index: number
  /** Its number from 1, as the agent and the tool name it. */
  number: number
  text: string
  picked: boolean
}

/** A split as the stop's editor shows it. */
export interface FeatureSplitView {
  points: FeatureSplitPointView[]
  title: string
  /** How many move and how many stay, in one line. */
  count: string
  /** The stop also offers changing what proves the feature. */
  canChangeProof: boolean
  changeProof: boolean
  /** The proof editor, while changing it. */
  proof?: ProofChangeView
  note: string
  /** Why it cannot be sent as it stands. */
  problem?: string
  canSend: boolean
}

/** What a split sends with the resume, by the names the route and `answerRunPark` take. */
export interface FeatureSplitResumeFields {
  movePoints: number[]
  followUpTitle: string
  proofKinds?: ProofKind[]
  note?: string
}

/** How the split editor picks points: a switch each, or a row each that says whether it moves or stays. */
export type FeatureSplitPointLook = 'switch' | 'row'
