import type { ProposalChip } from './processProposalView'
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
  /** It cannot be picked: this host or process cannot prove it. One already picked can be dropped. */
  disabled: boolean
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
  /** What the feature's or story's own plan asked for that was dropped, one line each, with why. */
  dropped: string[]
  notes: string
  /** No kind is picked: the run then chooses its proof automatically. */
  empty: boolean
  /**
   * The feature looks like a change to what users see and its plan, as it
   * stands, asks for no before/after screens — it will not pass without them.
   */
  uiWarning?: string
  /**
   * Only the feature's words mention what users see, and its plan asks for no
   * screens — a hint, not a warning: screens only if the change shows on screen.
   */
  uiHint?: string
}

/**
 * One feature on the launch card: the steps it runs through and how it is
 * proven, together — see `launchFeatureRows`.
 */
export interface LaunchFeatureRow {
  featureId: string
  title: string
  /** Its pipeline, in order; empty when the plan is not known. */
  chain: ProposalChip[]
  maxIterations?: number
  /** Its proof plan as confirmed here; absent when the launch carries none for it. */
  proof?: LaunchProofPlanRow
  /** The kinds its proof asks for, by label — the row's collapsed summary. */
  proofLabels: string[]
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
