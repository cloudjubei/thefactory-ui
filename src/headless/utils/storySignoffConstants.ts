import type { ProcessStepKind } from 'thefactory-tools/types'

import type { ReviewEvidenceVerdict } from '../api/generated'
import type { CheckMethodId, ReviewTabId } from './checkMethodTypes'
import type { ProcessStatusTone, VerifyReviewStatus } from './processView'
import type { ReportAuthor } from './reviewEvidenceViewTypes'
import type { SignoffSection, StoryStepKey } from './storySignoffTypes'
import type { VerifyVerdictNote } from './verifyProofTypes'

/**
 * The Overall section's line. Nothing checked is its own line rather than "All
 * green": a story whose project declares no checks has nothing that failed, and
 * calling that green read as a pass nobody ran.
 */
export const OVERALL_STATUS: Record<'failed' | 'green' | 'unchecked', VerifyReviewStatus> = {
  failed: { tone: 'stuck', label: 'Checks failed' },
  green: { tone: 'done', label: 'All green' },
  unchecked: { tone: 'review', label: 'Not checked' },
}

/**
 * The story run's own steps the Overall sums up, by the kind of step each is:
 * the walkthrough, the code review and the final report. Each can end without
 * filing anything — a skipped walkthrough, a report that errored — and a restart
 * unvouches what they did file, so their ledger entries are what is read.
 */
export const STORY_STEP_KINDS: Record<StoryStepKey, ProcessStepKind> = {
  walkthrough: 'capture',
  'code-review': 'judge',
  report: 'report',
}

/** The chip each of the story run's own steps decides. */
export const STORY_STEP_METHODS: Record<StoryStepKey, CheckMethodId> = {
  walkthrough: 'walkthrough',
  'code-review': 'diff',
  report: 'report',
}

/** The tab each of the story run's own steps' chip opens. */
export const STORY_STEP_TABS: Record<StoryStepKey, ReviewTabId> = {
  walkthrough: 'walkthrough',
  'code-review': 'code-review',
  report: 'report',
}

/** How a story step stands, in the words its summary line says it. */
export const STORY_STEP_WORDS = {
  running: 'Running',
  recorded: 'Recorded',
  failed: 'Failed',
  written: 'Written',
  notWritten: 'Not written',
  noVerdict: 'No verdict',
} as const

/** A step the story run's plan holds that has not run yet — its chip's line. */
export const STORY_STEP_NOT_RUN = 'Has not run yet.'

/**
 * How the backend's driver summed up a code review before it kept the verdict
 * on the ledger entry: `Code review: <words>`, then ` — <reason>` when it gave one.
 */
export const CODE_REVIEW_SUMMARY =
  /^Code review: (approved|changes requested|rejected)(?: — ([\s\S]+))?$/

/** The verdict each of the driver's summary words stands for. */
export const CODE_REVIEW_SUMMARY_VERDICTS: Record<string, ReviewEvidenceVerdict> = {
  approved: 'approved',
  'changes requested': 'changes-requested',
  rejected: 'rejected',
}

/** The story headline's detail when its code review turned the change back without saying why. */
export const STORY_REVIEW_TURNED_BACK = 'The story’s code review turned the change back.'

/** The story headline when only the story's own steps concluded anything. */
export const STORY_WIDE_ONLY_TITLE = 'No feature has been verified'

/**
 * A story step's outcome tone, in the three tones a sign-off note takes: only a
 * pass is done and only a failure or error is stuck — a skipped walkthrough is
 * best-effort by design, never a failure of the story.
 */
export const STORY_STEP_NOTE_TONE: Record<ProcessStatusTone, VerifyVerdictNote['tone']> = {
  done: 'done',
  stuck: 'stuck',
  working: 'review',
  blocked: 'review',
  queued: 'review',
  on_hold: 'review',
  review: 'review',
  empty: 'review',
}

export const SIGNOFF_LOADING = 'Loading the sign-off…'
export const SIGNOFF_LOAD_FAILED = 'Couldn’t load the sign-off'

/** The report a section's own report step files — the story's, or the feature's. */
export const SECTION_STEP_REPORT: Record<'story' | 'feature', ReportAuthor> = {
  story: 'final-report',
  feature: 'feature-report',
}

/** A section nothing in scope was filed for. */
export const EMPTY_SIGNOFF_SECTION: SignoffSection = {
  pairs: [],
  recordings: [],
  reports: [],
  codeReviews: [],
  notes: [],
  leadTab: undefined,
}
