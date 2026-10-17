import type {
  ProcessIntegrationDecision,
  ProcessWorkBranchLandingCheck,
} from 'thefactory-tools/types'

/** What the server read for finishing an ended run as already landed (`GET …/landing-check`). */
export interface ProcessRunLandingPreview {
  check: ProcessWorkBranchLandingCheck
  offered: boolean
  features: Array<{ id: string; title: string; status: string; after: string }>
}

/** "Finish as already landed" on an approved run whose work did not land, as the run page offers it. */
export interface ProcessAlreadyLandedOffer {
  /** "Nothing to merge — this work was already on <base> (since <commit>)." */
  text: string
  /** The commit the base has held the work since, in full. */
  sha: string
  /** The features of its story the run worked, as dependencies, and whether finishing makes each done. */
  features: Array<{ dependency: string; title: string; becomesDone: boolean }>
  label: string
  detail: string
}

/** Finishing a run at a stop as already merged, as its stop offers it. */
export interface ProcessAlreadyMergedAction {
  offer: ProcessAlreadyLandedOffer
  busy: boolean
  /** Why the last try was refused. */
  error: string | null
  onSettle: () => void
}

/** A sign-off whose work branch adds nothing its base does not already hold. */
export interface ProcessAlreadyOnBaseSignOff {
  /** What the decision card says up front. */
  notice: string
  /** "Approve — already on <base>". */
  approveLabel: string
  /** What Approve sends: the first way offered — nothing is merged, so nothing more is asked. */
  decision: ProcessIntegrationDecision
}
