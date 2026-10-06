import type {
  CodeReviewCriterionStatus,
  CodeReviewFindingSeverity,
  ReviewEvidenceVerdict,
} from 'thefactory-tools/types'

import type {
  CodeReviewFindingsGroupBy,
  CodeReviewTone,
  CodeReviewVerdictBadge,
} from './signoffCodeReviewTypes'

/** Worst first — the order findings are grouped in and tiles are laid out in. */
export const CODE_REVIEW_SEVERITIES: readonly CodeReviewFindingSeverity[] = [
  'blocker',
  'major',
  'minor',
  'nit',
]

export const CODE_REVIEW_SEVERITY_TONE: Record<CodeReviewFindingSeverity, CodeReviewTone> = {
  blocker: 'stuck',
  major: 'stuck',
  minor: 'working',
  nit: 'neutral',
}

/** A count of findings in words — "3 minor", "2 nits". */
export const CODE_REVIEW_SEVERITY_PLURAL: Record<CodeReviewFindingSeverity, [string, string]> = {
  blocker: ['blocker', 'blockers'],
  major: ['major', 'major'],
  minor: ['minor', 'minor'],
  nit: ['nit', 'nits'],
}

export const CODE_REVIEW_CRITERION_LABEL: Record<CodeReviewCriterionStatus, string> = {
  met: 'met',
  partly: 'partly',
  'not-met': 'not met',
}

export const CODE_REVIEW_CRITERION_MARK: Record<CodeReviewCriterionStatus, string> = {
  met: '✓',
  partly: '◐',
  'not-met': '✗',
}

export const CODE_REVIEW_CRITERION_TONE: Record<CodeReviewCriterionStatus, CodeReviewTone> = {
  met: 'done',
  partly: 'working',
  'not-met': 'stuck',
}

export const CODE_REVIEW_VERDICT_BADGES: Record<
  CodeReviewVerdictBadge['key'],
  CodeReviewVerdictBadge
> = {
  approved: { key: 'approved', label: 'Approved', tone: 'done' },
  'changes-requested': { key: 'changes-requested', label: 'Changes requested', tone: 'stuck' },
  rejected: { key: 'rejected', label: 'Rejected', tone: 'stuck' },
  'proof-impossible': {
    key: 'proof-impossible',
    label: 'Could not be proven here',
    tone: 'review',
  },
  none: { key: 'none', label: 'No verdict', tone: 'review' },
}

export const CODE_REVIEW_NO_FINDINGS = 'None'
export const CODE_REVIEW_NO_CRITERIA = 'None listed'
export const CODE_REVIEW_CRITERIA_TILE_LABEL = 'criteria met'
export const CODE_REVIEW_WORTH_A_LOOK_LABEL = 'Worth a look:'
export const CODE_REVIEW_SECTION_TITLES = {
  findings: 'Findings',
  criteria: 'Acceptance criteria',
  evidence: 'Evidence',
  shows: 'Shows',
  unproven: 'Leaves unproven',
} as const

/** What a severity's group is headed. */
export const CODE_REVIEW_SEVERITY_GROUP_TITLE: Record<CodeReviewFindingSeverity, string> = {
  blocker: 'Blockers',
  major: 'Major',
  minor: 'Minor',
  nit: 'Nits',
}

export const CODE_REVIEW_GROUP_BY_OPTIONS: readonly {
  key: CodeReviewFindingsGroupBy
  label: string
}[] = [
  { key: 'severity', label: 'Severity' },
  { key: 'file', label: 'File' },
]

export const CODE_REVIEW_GROUP_BY_LABEL = 'Group by'

/** The file group of findings that name no file. */
export const CODE_REVIEW_NO_FILE_GROUP = 'Not tied to one file'

/** The longest a title read from a finding's first clause may be before it is clipped. */
export const CODE_REVIEW_DERIVED_TITLE_MAX = 64

/** The shortest first clause read as a title — shorter is an abbreviation ("e.g."), not a clause. */
export const CODE_REVIEW_DERIVED_TITLE_MIN = 8

/** A reviewer's way of saying the evidence leaves nothing unproven. */
export const CODE_REVIEW_NOTHING_UNPROVEN_WORDS = /^(?:none|nothing|n\/a|-|—)\.?$/i

export const CODE_REVIEW_UNPROVEN_CHIPS = {
  none: 'Nothing left unproven',
  unstated: 'The reviewer didn’t say what it left unproven',
} as const

export const CODE_REVIEW_HOW_SHOWN_LABEL = 'How it was shown:'

/** How long a section's one-line summary may run. */
export const CODE_REVIEW_SUMMARY_MAX = 90

/** A review headline that opens with its verdict — read only when no recorded verdict exists. */
export const CODE_REVIEW_HEADLINE_VERDICT = /^\s*(approved|changes\s+requested|rejected)\b/i

export const CODE_REVIEW_HEADLINE_VERDICTS: Record<string, ReviewEvidenceVerdict> = {
  approved: 'approved',
  'changes requested': 'changes-requested',
  rejected: 'rejected',
}
