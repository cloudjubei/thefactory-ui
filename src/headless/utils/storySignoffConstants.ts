import type { ProcessStepKind } from 'thefactory-tools/types'

import type { ProcessStatusTone, VerifyReviewStatus } from './processView'
import type { ReportAuthor } from './reviewEvidenceViewTypes'
import type { SignoffSection } from './storySignoffTypes'
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
 * The story run's own steps the Overall says the end of: the walkthrough, the
 * code review and the final report. Each can end without filing anything — a
 * skipped walkthrough, a report that errored — so its ledger entry is the one
 * place the reason is read.
 */
export const OVERALL_NOTE_STEP_KINDS: readonly ProcessStepKind[] = ['capture', 'judge', 'report']

/** Said of one of the story run's own steps that is still running. */
export const STORY_STEP_RUNNING = 'running'

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
