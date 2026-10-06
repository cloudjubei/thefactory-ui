import type { CheckMethodRow, ReviewTabId } from './checkMethodTypes'
import type { CodeReviewTone } from './signoffCodeReviewTypes'
import type { RunReviewFacts } from './runReviewTypes'
import type { ProcessStatusTone, VerifyReviewStatus } from './processView'
import type { ScreenPair } from './reviewEvidenceViewTypes'
import type { FeatureVerifyView } from './verifyProofTypes'

/** A section of the sign-off a person should look at before deciding. */
export type SignoffAttentionInput = {
  /** The section's id — a feature id, or a fix pass's section id. */
  id: string
  /** The feature's `story.feature` reference; absent for a fix pass. */
  dependency: string | undefined
  /** What to call it when it has no reference — "Fix · pass 2". */
  label: string
} & Pick<FeatureVerifyView, 'mode' | 'standing'>

/** One line of the attention box: what needs a look, and where to see what Verify said. */
export type SignoffAttentionItem = {
  key: string
  sectionId: string
  dependency: string | undefined
  label: string
  text: string
  action: string
}

/** What a chip opens: a tab of the evidence card, or the explanation of a check that did not run. */
export type SignoffEvidenceTarget =
  | { kind: 'tab'; tab: ReviewTabId }
  | { kind: 'missing'; title: string; text: string }

/** One evidence chip — a tab of the evidence card. Checked first, missing last. */
export type SignoffEvidenceChip = {
  key: string
  row: Pick<CheckMethodRow, 'id' | 'label' | 'state' | 'available'>
  target: SignoffEvidenceTarget
}

/** A proof-plan kind as a chip on a feature row: its name and whether it was met. */
export type SignoffProofChip = {
  key: string
  label: string
  mark: string
  tone: CodeReviewTone
  detail: string
}

/** One feature (or fix pass) of the "What this is" card. */
export type SignoffFeatureRowView = {
  key: string
  /** The `story.feature` reference its chip resolves; absent for a fix pass. */
  dependency: string | undefined
  /** The chip's text when there is no reference — "Fix · pass 2". */
  label: string
  title: string
  proofChips: SignoffProofChip[]
  criteria: string[]
  criteriaLine: string | undefined
  status: VerifyReviewStatus
  facts: RunReviewFacts
}

/** A project the leg waits on, as a chip: its name and where it stands. */
export type SignoffMergeHoldLeg = {
  key: string
  name: string
  status: string
  tone: ProcessStatusTone
}

/** Why a group leg cannot merge yet, and the legs it waits on — Approve is not offered. */
export type SignoffMergeHold = { reason: string; waitingOn: SignoffMergeHoldLeg[] }

/** Whether the newest fix pass met what the person asked at sign-off, and the pairs that show it. */
export type SignoffRequestOutcome = {
  /** The fix pass's section — what "What this is" opens. */
  sectionId: string
  label: string
  state: 'met' | 'unmet'
  /** "Your request “…” is met — 1 before/after pair". */
  text: string
  /** The before/after pairs its verify counted — each opens the pair viewer. */
  pairs: ScreenPair[]
}
