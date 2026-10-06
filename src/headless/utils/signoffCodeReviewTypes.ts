import type { CodeReviewCriterionStatus, CodeReviewFindingSeverity } from 'thefactory-tools/types'

import type { ReviewEvidenceVerdict, ReviewEvidenceVerdictCause } from '../api/generated'

/** The palette a code review is drawn in — the package's own status keys, plus a neutral grey. */
export type CodeReviewTone = 'done' | 'review' | 'stuck' | 'working' | 'neutral'

/** What the review concluded, as its badge says it. */
export type CodeReviewVerdictBadge = {
  key: 'approved' | 'changes-requested' | 'rejected' | 'proof-impossible' | 'none'
  label: string
  tone: CodeReviewTone
}

/** A severity count, or the criteria tally, as a tile that filters the findings. */
export type CodeReviewTile = {
  key: CodeReviewFindingSeverity | 'criteria'
  label: string
  count: string
  tone: CodeReviewTone
}

/** The verdict a run's ledger kept for a code review — what its badge says over the filing's own. */
export type CodeReviewRecordedVerdict = {
  verdict: ReviewEvidenceVerdict
  cause?: ReviewEvidenceVerdictCause
}

/** Where a finding or criterion is: code (backticks dropped) or inline markdown. */
export type CodeReviewWhere = { code: boolean; text: string }

/**
 * Where a finding is, split for its card: the file as a chip (its line kept
 * apart), the symbol after it, or — when the reviewer wrote something that
 * names no file — that place as inline markdown.
 */
export type CodeReviewFindingPlace = {
  file: string | undefined
  line: string | undefined
  symbol: string | undefined
  prose: string | undefined
}

/** One finding, ready to draw as a card. */
export type CodeReviewFindingRow = {
  key: string
  severity: CodeReviewFindingSeverity
  place: CodeReviewFindingPlace
  /** The reviewer's short title, else the explanation's first clause. */
  title: string
  /** The explanation under the title — empty when the title already says all of it. */
  text: string
  tone: CodeReviewTone
}

/** How the findings are grouped. */
export type CodeReviewFindingsGroupBy = 'severity' | 'file'

/** One group of findings: a severity, or a file. */
export type CodeReviewFindingGroup = {
  key: string
  kind: CodeReviewFindingsGroupBy
  title: string
  /** The severity's tone; neutral for a file. */
  tone: CodeReviewTone
  /** "3 findings". */
  count: string
  /** Folded until opened — the nits. */
  defaultOpen: boolean
  rows: CodeReviewFindingRow[]
}

/**
 * What the reviewer said the evidence leaves unproven: a list, nothing at all
 * (it said none), or nothing said — an older review that never addressed it.
 */
export type CodeReviewUnproven =
  | { state: 'listed'; items: string[] }
  | { state: 'none' }
  | { state: 'unstated' }

/** One acceptance criterion and where the reviewer found it met. */
export type CodeReviewCriterionRow = {
  key: string
  text: string
  status: CodeReviewCriterionStatus
  /** ✓, ◐ or ✗ — the row's leading mark. */
  mark: string
  statusLabel: string
  tone: CodeReviewTone
  /** How and where it was shown — opened under the row. */
  where: CodeReviewWhere | undefined
}

/** The review's four fixed sections, laid out once for every client. */
export type CodeReviewView = {
  verdict: CodeReviewVerdictBadge
  headline: string
  detail: string | undefined
  worthALook: string | undefined
  tiles: CodeReviewTile[]
  findings: CodeReviewFindingRow[]
  findingsSummary: string
  criteria: CodeReviewCriterionRow[]
  criteriaSummary: string
  criteriaMet: { met: number; total: number } | undefined
  shows: string
  /** What the evidence shows, one entry per line the reviewer wrote. */
  showsItems: string[]
  unproven: CodeReviewUnproven
  evidenceSummary: string
  /** The review as filed, for a download. */
  markdown: string | undefined
}

/** What a step preview shows of a review: its badge, one line, and the counts. */
export type CodeReviewPreview = {
  verdict: CodeReviewVerdictBadge
  line: string
  chips: { key: string; label: string; tone: CodeReviewTone }[]
}
