import type { ProcessLedgerEntry, ProcessRun, ProcessVerifyReview } from 'thefactory-tools/types'

import type { ReviewEvidenceVerdict } from '../api/generated'
import type { VerifyReviewStatus } from './processView'
import type { EvidenceTile, EvidenceUnvouched, ScreenPair } from './reviewEvidenceViewTypes'

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

/** One piece of the dry line's "Built from" row: a word, or a commit shown as a chip. */
export type DryBuildPart = { kind: 'word'; text: string } | { kind: 'sha'; sha: string }

/** One row of the table a dry line folds open. */
export type DryProofRow =
  | { kind: 'text'; label: string; text: string }
  | { kind: 'build'; label: string; parts: DryBuildPart[] }

/**
 * A dry verification said as one quiet line under the attempt's header, its
 * detail folded open in place. A caveat, not an alarm: the attempt ran on faked
 * data, and the rows say what was faked and against which builds.
 */
export type VerifyProofDryLine = {
  /** "Verified dry" — or "Checked dry" for an attempt the gate did not pass. */
  lead: string
  text: string
  /** The toggle's words, folded and unfolded. */
  toggle: { open: string; close: string }
  rows: DryProofRow[]
}

/**
 * A proof whose every counted capture the backend can no longer vouch for —
 * after a restart, every proof filed before it. The gate's outcome is kept as
 * recorded; this says why nothing under it counts now.
 */
export type VerifyProofUnvouched = {
  /** A few words for a collapsed section's header. */
  chip: string
  /** The banner's line. */
  text: string
}

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
  /** The one line a dry attempt shows in place of a banner; absent unless dry. */
  dry: VerifyProofDryLine | undefined
  /** The base commit every before had to be built from, shortened — an expectation, not a caption. */
  baseSha: string | undefined
  /** The branch commit every after had to be built from, shortened — an expectation, not a caption. */
  headSha: string | undefined
  /** Test-seam commits the base was built with, shortened. */
  seams: string[]
  /** Set when nothing the proof rested on can still be vouched for. */
  unvouched: VerifyProofUnvouched | undefined
}

/** One before/after pair the gate judged, ready to render. */
export type ProofPairView = {
  /** Unique across every surface sharing one comparison overlay. */
  key: string
  /** Position in the overlay's paging order, 1-based. */
  index: number
  subject: string
  /**
   * Whether it shows the change: the gate counted it AND both sides can still be
   * vouched for. One the gate counted whose capture cannot be is shown with what
   * did not count.
   */
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
  /** "Shows the change" for a counted pair; otherwise the reason it does not count. */
  verdict: string
  /** Why a side cannot be vouched for — shown in full under the verdict. */
  unvouched: EvidenceUnvouched | undefined
  /** The changed share of the screen for a thumbnail's corner — "8%", "<1%" — or "new"; absent when unmeasured. */
  marker: string | undefined
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

/**
 * An after shown with what did not count: one the reviewer filed with no before
 * under its subject, or a screen the change adds that can no longer be vouched for.
 */
export type ProofUnpairedView = {
  key: string
  index: number
  subject: string
  afterId: string
  after: EvidenceTile | undefined
  afterAbsent: string | undefined
  /** Why it does not count. */
  reason: string
  /** Why the after cannot be vouched for — shown in full under the reason. */
  unvouched: EvidenceUnvouched | undefined
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
  /** Afters shown alone — the last of what did not count. */
  unpaired: ProofUnpairedView[]
  /**
   * Whether the gate's outcome rested on a counted pair or a new screen, as the
   * gate judged it — whether or not those can still be vouched for.
   */
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
  /**
   * No verdict is found and some of the attempt's filings cannot be vouched
   * for: the backend drops the verdict of such a filing, so one may have been
   * given and is not shown.
   */
  verdictUnvouched: boolean
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

/** A feature's verification in the sign-off: the attempt its latest run was accepted on. */
export type FeatureVerifyView = {
  accepted: VerifyAttemptView
  /** Which attempt is shown and why — "Verify attempt 4 of 4 — the one the gate passed". */
  acceptedLabel: string
  standing: VerifyAttemptStanding
  /** What data the shown attempt ran on — unknown when its entry records no proof. */
  mode: VerifyProofMode
  /** The shown attempt stands, yet nobody said what data it ran on. */
  dataUnstated: boolean
  /** Nothing the shown attempt's proof rested on can still be vouched for. */
  proofUnvouched: boolean
}

/** One sign-off section's accepted verification, as the story-wide notice reads it. */
export type StoryProofSection = { label: string } & Pick<
  FeatureVerifyView,
  'mode' | 'standing' | 'dataUnstated' | 'proofUnvouched'
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

/** A feature's section in the story sign-off: its accepted attempt and which one it is. */
export type FeatureVerifySectionProps = VerifySectionProps & {
  attemptLabel: string
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
  /** Said in place of a build when the backend cannot vouch for the capture. */
  unvouched: string | undefined
}

/** One thumbnail in the Screens pane: a pair or new screen the proof rests on. */
export type ProofThumbnail = {
  key: string
  subject: string
  before: EvidenceTile | undefined
  after: EvidenceTile | undefined
  /** What to show in place of an absent side — loading, a failed load, or not in the store. */
  beforeAbsent: string | undefined
  afterAbsent: string | undefined
  /** The corner marker — the changed share, or "new" for a screen the change adds. */
  marker: string | undefined
  /** What the per-thumbnail save and the comparison overlay act on. */
  screen: ScreenPair
}

/** Which side the Screens pane's thumbnails show. */
export type ProofThumbnailSide = 'before' | 'after'

/** The frame a thumbnail shows for a side: the capture, or why it is absent. */
export type ProofThumbnailFrame = { tile: EvidenceTile | undefined; absent: string | undefined }

/** The captures a proof did not rest on, folded into one quiet line. */
export type ProofNotCountedFold = { count: number; label: string }

/** A verify attempt's Screens pane: the proving thumbnails, and everything else folded. */
export type ProofScreensPane = {
  /** Counted pairs, then the screens the change adds — the proof, in the page's order. */
  thumbnails: ProofThumbnail[]
  /** Any thumbnail has a before to switch to — the toggle is shown only then. */
  hasBefore: boolean
  /** The attempt's own line, said only when there is no thumbnail to show instead. */
  summary: VerifyProofSummary | undefined
  notCounted: ProofNotCountedFold | undefined
  saveAllLabel: string
}
