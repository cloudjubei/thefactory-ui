import type { ProofKind, ProofPlan, ProofPlanSource } from 'thefactory-tools/types'

import type { StoryStepTone } from './storySignoffTypes'

/** One kind of proof as every picker offers it. */
export interface ProofKindOptionView {
  kind: ProofKind
  label: string
  /** What it asks for, in one plain line. */
  meaning: string
}

/** A plan's kinds as an editor toggles them, before it is saved. */
export interface ProofPlanDraft {
  kinds: ProofKind[]
  notes: string
}

/** One kind on a launch's confirmation row. */
export interface LaunchProofKindView extends ProofKindOptionView {
  checked: boolean
  /** Why this host or process cannot prove it; absent when it can. */
  unavailable?: string
}

/** A kind the plan asks for that cannot be proven here, and why. */
export interface LaunchProofFlag {
  kind: ProofKind
  label: string
  reason: string
}

/** One feature's proof plan as the launch shows it for confirmation. */
export interface LaunchProofPlanRow {
  featureId: string
  title: string
  source: ProofPlanSource
  /** Where the plan came from, in words — "Suggested" when the feature has none. */
  sourceLabel: string
  /** The person changed it on this launch. */
  edited: boolean
  kinds: LaunchProofKindView[]
  /** Kinds it asks for that this host or process cannot prove. */
  flagged: LaunchProofFlag[]
  notes: string
  /** No kind is picked: the run then chooses its proof automatically. */
  empty: boolean
  /**
   * The feature looks like a change to what users see and its plan, as it
   * stands, asks for no before/after screens — it will not pass without them.
   */
  uiWarning?: string
}

/** The plans a person changed on a launch, by feature id. */
export type LaunchProofPlanEdits = Readonly<Record<string, ProofPlanDraft>>

/** The launch approval's metadata for the confirmed plans — what the launch snapshots. */
export interface ProofPlanLaunchMetadata {
  proofPlans: Record<string, ProofPlan>
  saveProofPlans?: true
}

/** One kind of a feature's plan as its sign-off marks it. */
export interface ProofPlanMarkRow {
  kind: ProofKind
  label: string
  /** Where it stands, in a word or two: "Met", "Not met", "At sign-off". */
  word: string
  detail: string
  tone: StoryStepTone
}
