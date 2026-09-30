import {
  CODE_REVIEW_APPROACH,
  FEATURE_REPORT_APPROACH,
  FINAL_REPORT_APPROACH,
} from 'thefactory-tools/constants'

import type { ReviewEvidenceVerdict } from '../api/generated'
import type { ReportAuthor, ScreenPairClass } from './reviewEvidenceViewTypes'

/** The reviewer's conclusion as it reads on screen. */
export const REVIEWER_VERDICT_LABEL: Record<ReviewEvidenceVerdict, string> = {
  approved: 'Approved',
  'changes-requested': 'Changes requested',
  rejected: 'Rejected',
}

/** What a tile in the Screens strip is, under its title. */
export const SCREEN_PAIR_META: Record<ScreenPairClass, string> = {
  pair: 'before / after',
  new: 'only on the branch',
  removed: 'only on the base',
  single: 'single capture',
}

/** The strip's line under a tile while its capture is still running. */
export const SCREEN_PAIR_CAPTURING_META = 'capturing…'

/** What a pair IS, said under the comparison when the gate left no note on it. */
export const SCREEN_PAIR_FACT: Record<ScreenPairClass, string> = {
  pair: 'Captured on both the base and the branch.',
  new: 'This screen exists only on the branch.',
  removed: 'This screen exists only on the base.',
  single: 'A single capture — there is nothing to compare it with.',
}

/**
 * The steps that file a report of their own, by the approach they file it
 * under — keyed by the tools' own constants, so a renamed approach can never
 * fall through to being read as the verifier's report.
 */
export const REPORT_AUTHOR_BY_APPROACH: ReadonlyMap<string, ReportAuthor> = new Map([
  [CODE_REVIEW_APPROACH, 'code-review'],
  [FINAL_REPORT_APPROACH, 'final-report'],
  [FEATURE_REPORT_APPROACH, 'feature-report'],
])

/** Reports a step writes as its own account — they lead the Report tab they belong to. */
export const STEP_REPORT_AUTHORS: readonly ReportAuthor[] = ['final-report', 'feature-report']

/** Reports that belong to a tab other than a run's own Report tab. */
export const ELSEWHERE_REPORT_AUTHORS: readonly ReportAuthor[] = ['code-review', 'final-report']

/** "How this report was produced", said of each author's report. */
export const REPORT_PROVENANCE: Record<ReportAuthor, string> = {
  verifier:
    "The verifier agent wrote it as its closing step, after building and driving the app. It is that agent's own account of what it did — not a summary of the diff, and not written by the agent that made the change.",
  'final-report':
    'The report step wrote it at the end of the story run, from the run’s record — what was asked, what each feature did and how it was checked, what the code review found, and what is left open. It is not the verifier agent’s account, and not written by the agent that made the change.',
  'feature-report':
    'The feature’s report step wrote it from the feature run’s record — what was done, how it was checked and what was decided. It is not the verifier agent’s account, and not written by the agent that made the change.',
  'code-review':
    'The code review step wrote it after reading the change and its evidence against what was asked. Its verdict is the reviewer’s finding — the sign-off is still yours.',
}
