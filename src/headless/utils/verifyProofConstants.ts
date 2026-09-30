import type { ProcessResumeChoice, ProcessStepOutcome } from 'thefactory-tools/types'

import type { VerifyProofMode, VerifyProofTone } from './verifyProofTypes'

export const PROOF_MODE_TONE: Record<VerifyProofMode, VerifyProofTone> = {
  live: 'done',
  dry: 'working',
  unknown: 'empty',
}

/** The banner's headline, by mode — worded for an attempt that passed, and one that did not. */
export const PROOF_MODE_TITLE: Record<VerifyProofMode, { passed: string; other: string }> = {
  live: { passed: 'Verified on live data', other: 'Checked on live data' },
  dry: {
    passed: 'Verified dry — not against the live backend',
    other: 'Checked dry — not against the live backend',
  },
  unknown: {
    passed: 'The reviewer did not say whether this ran on live data',
    other: 'The reviewer did not say whether this ran on live data',
  },
}

export const PROOF_MODE_DETAIL: Record<VerifyProofMode, string> = {
  live: 'The change was seen working against the real backend’s data.',
  dry: 'The data it depends on was faked, so this shows the change works — not that the live backend will trigger it.',
  unknown: 'Treat it as unconfirmed against the live backend until someone checks.',
}

/** The collapsed header's flag. `unknown` shows only on an attempt that stands — see `VerifyProofHeader.unstated`. */
export const PROOF_MODE_CHIP: Record<VerifyProofMode, string> = {
  live: 'Live data',
  dry: 'Dry run',
  unknown: 'Data not stated',
}

export const DRY_FAKED_MISSING = 'The reviewer did not say what was faked.'

/** The dry line's lead, worded like `PROOF_MODE_TITLE` for an attempt that passed, and one that did not. */
export const DRY_LINE_LEAD: { passed: string; other: string } = {
  passed: 'Verified dry',
  other: 'Checked dry',
}
export const DRY_LINE_TEXT = '— the data it depends on was faked, not sent by the live backend.'
export const DRY_LINE_TOGGLE: { open: string; close: string } = {
  open: 'What was faked',
  close: 'Hide',
}
export const DRY_ROW_FAKED = 'Faked'
export const DRY_ROW_BUILT_FROM = 'Built from'
export const DRY_BUILD_SEAM: { one: string; many: string } = {
  one: 'with seam',
  many: 'with seams',
}
export const DRY_BUILD_ARROW = '→'

/** A thumbnail's corner marker for a screen the change adds — it has no before to measure against. */
export const PROOF_THUMB_NEW_MARKER = 'new'
/** A thumbnail's corner marker for a change under one percent — never rounded down to nothing. */
export const PROOF_THUMB_UNDER_ONE = '<1%'
export const PROOF_NOT_COUNTED_TAIL = 'not part of the proof'

export const PAIR_COUNTED_VERDICT = 'Shows the change'
export const PAIR_NOT_COUNTED_VERDICT = 'Did not count as proof.'
export const PAIR_IDENTICAL = 'Pixel-identical'
export const PAIR_UNMEASURED = 'Not measured'
export const NEW_SCREEN_TITLE = 'New screen'
export const NEW_SCREEN_NOTE = 'A screen the change adds — there is no before to compare it with.'
export const NEW_SCREEN_ENTRY_NOTE =
  'A screen the change adds — beside the entry point on the base it opens from.'
export const NEW_SCREEN_PAIR_CHANGE = 'A new screen, beside its entry point on the base'

export const NO_PAIR_FILED = 'No before/after pair was filed'
export const NO_PAIR_SHOWS_CHANGE = 'No pair shows the change'
export const PASSED_WITHOUT_PAIR = 'Passed without a before/after pair'
export const NOTHING_JUDGED =
  'Nothing was judged — the attempt ended before any evidence was reviewed'

export const ATTEMPT_EMPTY = 'The reviewer filed no evidence for this attempt.'
export const ATTEMPT_RUNNING_EMPTY = 'Nothing filed yet — the reviewer is still working.'

export const CAPTURE_LOADING = 'Loading…'
export const CAPTURE_LOAD_FAILED = 'Couldn’t load the evidence'
export const CAPTURE_MISSING = 'Not in the evidence store'

export const ACCEPTED_BY_YOU = 'Accepted by you'

/** The park answers that carry an attempt on over its gate — a person accepting it. */
export const ACCEPTING_CHOICES: readonly ProcessResumeChoice[] = ['continue', 'approve']
export const APPROVED_UNCONFIRMED = 'The reviewer approved, but the proof could not be confirmed'

/** What the gate concluded, as a sentence a person reads beside their own decision. */
export const GATE_OUTCOME_SAID: Record<ProcessStepOutcome, string> = {
  passed: 'The gate passed it',
  failed: 'The gate did not pass it',
  unchecked: 'The gate could not confirm the proof',
  question: 'The gate stopped to ask a question',
  skipped: 'The gate never concluded',
  errored: 'The verify step errored',
}

/** Who a verdict note names as having concluded it. */
export const VERDICT_NOTE_WHO: Record<'reviewer' | 'codeReview', string> = {
  reviewer: 'Reviewer',
  codeReview: 'Code review',
}
