import type { ReviewEvidenceRef, ReviewEvidenceVerdict } from '../api/generated'

/**
 * Which of the backend's reasons an item could not be vouched for.
 *
 * `restart` is the everyday case — the item was filed before the backend last
 * restarted (or its record edited since), and after any restart EVERY earlier
 * item reads this way. `file-changed` and `capture-record` say something on the
 * host wrote over what was filed or captured. `other` is a reason this client
 * does not know yet, shown in the backend's own words.
 */
export type EvidenceUnvouchedCause = 'restart' | 'file-changed' | 'capture-record' | 'other'

/**
 * Why the running backend cannot vouch for an item, in words a reviewer reads.
 *
 * The backend lists such an item without its build, device, screen and verdict,
 * so a tile that simply dropped those looked broken. The image is kept; this
 * says why nothing is said about it, that it does not count, and what happens
 * next.
 */
export type EvidenceUnvouched = {
  cause: EvidenceUnvouchedCause
  /** A few words for a place too small for the sentence — a frame caption. */
  label: string
  /** The whole sentence. */
  text: string
}

/**
 * The reviewer's conclusion as a listing lets it be read. `concluded` is the
 * newest verdict filed. `unvouched` is a filing that lost whatever was filed
 * with it and is at least as new as any verdict: it may have carried a newer
 * one, so no older verdict can stand as the conclusion. `none` is a reviewer
 * who concluded nothing.
 */
export type ReviewerVerdictReading =
  | { state: 'concluded'; verdict: { verdict: ReviewEvidenceVerdict; reason?: string } }
  | { state: 'unvouched' }
  | { state: 'none' }

/**
 * Who wrote a filed report, read from the approach it was filed under — what
 * routes it to the tab it belongs to. A step that writes its own report files
 * it under its own approach; `verifier` is every other report, the verifier's
 * account included, as every report was read before those steps existed.
 */
export type ReportAuthor = 'verifier' | 'code-review' | 'final-report' | 'feature-report'

/** One evidence item ready to render, with its bytes resolved when it is an image. */
export type EvidenceTile = {
  ref: ReviewEvidenceRef
  /** Data URI for an image, once loaded. Absent for non-images and while loading. */
  dataUri?: string
  /** Text of a note/report, once loaded. Absent for non-notes and while loading. */
  text?: string
  /** Human caption — the label, falling back to the phase or the kind. */
  caption: string
  /** Present when the backend cannot vouch for this item: it is shown, never counted. */
  unvouched?: EvidenceUnvouched
}

/** A before/after pair of the same subject, or a single item with no counterpart. */
export type EvidenceGroup = {
  /** What the comparison is OF, or the item's id when it stands alone. */
  key: string
  title: string
  before?: EvidenceTile
  after?: EvidenceTile
  /** Items that are not part of a before/after pair. */
  singles: EvidenceTile[]
}

/** One image, captioned, ready for the full-screen zoom viewer. */
export type EvidenceViewerImage = {
  id: string
  /** Caption shown under the image, phase-prefixed for a pair. */
  caption: string
  dataUri: string
}

/**
 * What a screen pair IS, before any pixel comparison has run.
 *
 * `pair` is a before and an after whose difference is not yet computed — the
 * honest name for it until the backend files a diff. `new` and `removed` are
 * one-sided by construction. `single` is an unphased screenshot that belongs
 * to no comparison. There is deliberately no `changed`/`unchanged` here: that
 * is a claim about pixels, and nothing in this model has looked at any.
 */
export type ScreenPairClass = 'pair' | 'new' | 'removed' | 'single'

/** One tile in the Screens strip: a comparison, or a lone capture. */
export type ScreenPair = {
  key: string
  /** Walkthrough position, 1-based. Fixed at capture order — a filter never renumbers it. */
  index: number
  title: string
  class: ScreenPairClass
  before?: EvidenceTile
  after?: EvidenceTile
  /** What the verify gate made of this pair, said in place of the class's generic line. */
  note?: string
  /**
   * Set when either side cannot be vouched for. Such a pair never shows the
   * change, whatever the gate made of it when it ran.
   */
  unvouched?: EvidenceUnvouched
  /**
   * The commits the gate required the before and after to be built from. An
   * expectation only — a capture's caption comes from its own build record.
   */
  expectedBaseSha?: string
  expectedHeadSha?: string
}

/** A time window over filings — one review attempt's, typically. */
export type EvidenceWindow = { since: number; until?: number }
