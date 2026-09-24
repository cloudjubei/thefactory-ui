import type { ProcessLedgerEntry, ProcessRun, ProcessVerifyReview } from 'thefactory-tools/types'

import type { ReviewEvidenceVerdict } from '../api/generated'
import type { VerifyReviewStatus } from './processView'
import type { EvidenceTile, ScreenPair } from './reviewEvidenceView'

/** What data a verification saw the change on: the real backend's, faked, or it did not say. */
export type VerifyProofMode = 'live' | 'dry' | 'unknown'

/** The status palette a proof element is toned with — a subset of the package's status keys. */
export type VerifyProofTone = 'done' | 'working' | 'stuck' | 'empty'

/**
 * Where a verify attempt stands once the sign-off reads it.
 *
 * `accepted` is a person's decision, not the gate's: they answered the park with
 * continue or approve although the gate never passed the attempt, and the run
 * moved on as if it had. Reading the outcome alone showed that attempt as a
 * failure the story had somehow got past.
 */
export type VerifyAttemptStanding = 'passed' | 'accepted' | 'unchecked' | 'failed' | 'running'

/**
 * Whether the evidence a proof is read against has arrived. A capture that is
 * absent while it loads, or because the listing failed, is not missing.
 */
export type EvidenceLoadState = 'loading' | 'failed' | 'loaded'

/** What a dry verification faked, under the label that says why a reader needs it. */
export type VerifyProofFaked = { label: string; text: string }

/** The banner over a verify attempt's proof: what data it ran on, and against which builds. */
export type VerifyProofHeader = {
  mode: VerifyProofMode
  tone: VerifyProofTone
  title: string
  detail: string
  /** A few words for a collapsed section's header; absent when there is nothing to flag. */
  chip: string | undefined
  /** The attempt stands (passed, or accepted by a person) but its reviewer never said what data it ran on. */
  unstated: boolean
  /** The reviewer's own account of what was faked, verbatim. */
  dryAssumptions: string | undefined
  /** What to show under a dry banner — the account, or that there is none. */
  faked: VerifyProofFaked | undefined
  /** What is still owed before the change can be trusted end to end — an attempt that stands only. */
  todo: string | undefined
  /** The base commit every before had to be built from, shortened — an expectation, not a caption. */
  baseSha: string | undefined
  /** The branch commit every after had to be built from, shortened — an expectation, not a caption. */
  headSha: string | undefined
  /** Test-seam commits the base was built with, shortened. */
  seams: string[]
}

/** One before/after pair the gate judged, ready to render. */
export type ProofPairView = {
  /** Unique across every surface sharing one comparison overlay. */
  key: string
  /** Position in the overlay's paging order, 1-based. */
  index: number
  subject: string
  counted: boolean
  /** The before is the entry point on the base a new screen opens from, not the same screen. */
  newScreen: boolean
  beforeId: string
  afterId: string
  /** Absent when that capture is not in the loaded evidence. */
  before: EvidenceTile | undefined
  after: EvidenceTile | undefined
  /** What to show in place of an absent before — loading, a failed load, or not in the store. */
  beforeAbsent: string | undefined
  afterAbsent: string | undefined
  /** The measured difference in words — "219,902 px changed (9.2%)", "Pixel-identical". */
  change: string
  /** How much of the screen the two share, when both recorded it. */
  sameScreen: string | undefined
  /** "Shows the change" for a counted pair; otherwise the gate's reason it did not count. */
  verdict: string
  /** The sides the loaded evidence genuinely does not hold — empty until it has loaded. */
  missing: ('before' | 'after')[]
}

/** A capture the gate counted as a screen the change adds, beside the entry point it opens from. */
export type ProofScreenView = {
  key: string
  index: number
  id: string
  title: string
  tile: EvidenceTile | undefined
  /** What to show in place of an absent capture — loading, a failed load, or not in the store. */
  absent: string | undefined
  /** Where on the base the new screen opens from — absent when the gate recorded none. */
  entryPoint: EvidenceTile | undefined
  /** What to show in place of a recorded entry point that is not loaded. */
  entryPointAbsent: string | undefined
}

/** An after the reviewer filed with no before under its subject — shown, never counted. */
export type ProofUnpairedView = {
  key: string
  index: number
  subject: string
  afterId: string
  after: EvidenceTile | undefined
  afterAbsent: string | undefined
  /** The gate's reason it could not count. */
  reason: string
}

/** One line on what the proof amounts to, toned by what the attempt came to. */
export type VerifyProofSummary = { tone: VerifyProofTone; text: string }

/** A verify gate's judgement, as it renders: exactly the proof its outcome rested on. */
export type VerifyProofView = {
  /**
   * What data the attempt ran on. Absent for a pass that rested on no screens
   * and named no data — its basis is the gate's own words, and a banner there
   * could only call a sound pass unconfirmed.
   */
  header: VerifyProofHeader | undefined
  /** Every judged pair, the counted ones first, each group in the gate's order. */
  pairs: ProofPairView[]
  countedCount: number
  newScreens: ProofScreenView[]
  /** Afters with no before — the last of what did not count. */
  unpaired: ProofUnpairedView[]
  /** Whether a counted pair or a new screen carries the outcome. */
  restsOnScreens: boolean
  /** Recordings the approval covered, as far as they are loaded. */
  recordings: EvidenceTile[]
  summary: VerifyProofSummary
  /** Counted pairs, new screens, then the pairs and afters that did not count — the page's order. */
  screens: ScreenPair[]
}

/** One verify attempt of a feature: its ledger entry, where it sits among the attempts, and where its reviewer filed. */
export type VerifyAttempt = {
  entry: ProcessLedgerEntry
  /** 1-based, in the order the attempts started. */
  attempt: number
  total: number
  /** Where its reviewer filed — undefined when no reviewed run precedes it. */
  review: ProcessVerifyReview | undefined
}

/** The attempt a feature was accepted on, and every other attempt newest first. */
export type VerifyAttemptSelection = {
  accepted: VerifyAttempt
  others: VerifyAttempt[]
}

/** The process-run fields a verify selection reads. */
export type VerifyAttemptRun = Pick<ProcessRun, 'featureId' | 'ledger' | 'plan'>

/** The reviewer's own conclusion among an attempt's filings. */
export type VerifyReviewerVerdict = { verdict: ReviewEvidenceVerdict; reason?: string }

/** A conclusion shown above the evidence — the gate's, a person's, or the reviewer's. */
export type VerifyVerdictNote = {
  label: string
  reason?: string
  /** Every reason the gate gave, one per line, when it gave more than its one line. */
  details?: string[]
  tone: 'done' | 'review' | 'stuck'
}

/** Everything one verify attempt shows: its proof when the gate recorded one, else its own filings. */
export type VerifyAttemptEvidence = {
  proof: VerifyProofView | undefined
  /** What the comparison overlay pages through for this attempt. */
  pairs: ScreenPair[]
  /** Recordings the gate covered — or, for an entry with no proof, every one its reviewer filed. */
  recordings: EvidenceTile[]
  /** Recordings its reviewer filed that the gate did not cover. */
  uncountedRecordings: EvidenceTile[]
  reports: EvidenceTile[]
  verdict: VerifyReviewerVerdict | undefined
}

/** One verify attempt, ready to render in a sign-off. */
export type VerifyAttemptView = {
  key: string
  /** "Attempt 3 of 4". */
  title: string
  entry: ProcessLedgerEntry
  standing: VerifyAttemptStanding
  status: VerifyReviewStatus
  /** The reviewer is still at it, so an empty attempt is unfinished, not empty. */
  running: boolean
  /** A person's acceptance or the gate's conclusion, then the reviewer's. */
  notes: VerifyVerdictNote[]
  evidence: VerifyAttemptEvidence
}

/** A feature's verification in the sign-off: the accepted attempt, and the rest behind a disclosure. */
export type FeatureVerifyView = {
  accepted: VerifyAttemptView
  /** Which attempt is shown and why — "Verify attempt 4 of 4 — the one the gate passed". */
  acceptedLabel: string
  standing: VerifyAttemptStanding
  /** What data the shown attempt ran on — unknown when its entry records no proof. */
  mode: VerifyProofMode
  /** The shown attempt stands, yet nobody said what data it ran on. */
  dataUnstated: boolean
  others: VerifyAttemptView[]
  /** "Earlier attempts (3)"; absent when there are none. */
  othersLabel: string | undefined
}

/** One sign-off section's accepted verification, as the story-wide notice reads it. */
export type StoryProofSection = { label: string } & Pick<
  FeatureVerifyView,
  'mode' | 'standing' | 'dataUnstated'
>

/** The story-wide line naming what the gate did not pass, or not on live data. */
export type StoryProofNotice = { tone: VerifyProofTone; text: string }

/** What a sign-off section is handed for one verify attempt. */
export type VerifySectionProps = {
  pairs: ScreenPair[]
  recordings: EvidenceTile[]
  uncountedRecordings: EvidenceTile[]
  reports: EvidenceTile[]
  emptyLabel: string
  proof?: VerifyProofView
  /** A person's acceptance or the gate's conclusion, then the reviewer's — shown above the evidence. */
  notes: VerifyVerdictNote[]
}

/** A feature's section in the story sign-off: its accepted attempt, and the others folded. */
export type FeatureVerifySectionProps = VerifySectionProps & {
  attemptLabel: string
  otherAttempts?: { label: string; attempts: VerifyAttemptView[] }
}

/**
 * One side of a comparison, captioned from its capture's own build record. The
 * commit it should have come from is kept apart, as the expectation — a rejected
 * before built from the wrong commit must never be labelled with the right one.
 */
export type CaptureBuildCaption = {
  /** The commit the capture's build record names, shortened; absent when it has no record. */
  builtSha: string | undefined
  /** The build had uncommitted changes, so it is not exactly `builtSha`. */
  dirty: boolean
  /** The commit expected, shortened — present only when the record does not show it. */
  expectedSha: string | undefined
}
