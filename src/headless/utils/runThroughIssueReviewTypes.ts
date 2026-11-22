import type { RunThroughIssueAnswer, RunThroughIssueAnswerKind } from '../api/generated'
import type { RunThroughIssueRow } from './runThroughReportTypes'
import type { ProcessStatusTone } from './processView'

/** The answers given so far, by issue (its evidence id). */
export type RunThroughIssueAnswers = Readonly<Record<string, RunThroughIssueAnswer>>

/** How one issue stands: a fix, a fix in the person's own words, not an issue, or not answered yet. */
export type RunThroughIssueStanding = 'fix' | 'reply' | 'not-an-issue' | 'open'

/** Where the panel is: on an issue, by its place among the issues, or on the answers. */
export type RunThroughIssueReviewAt = number | 'summary'

/** One of the three answers an issue offers. */
export type RunThroughIssueChoice = {
  id: 'fix' | 'not-an-issue' | 'reply'
  /** The key that gives it: "1", "2" or "3". */
  key: string
  label: string
  detail: string
}

/** What a key press does in the panel. */
export type RunThroughIssueReviewKeyAction =
  | { kind: 'answer'; choice: RunThroughIssueChoice['id'] }
  | { kind: 'move'; by: 1 | -1 }

/** One dot of the strip: an issue, how it stands, and whether it is the one shown. */
export type RunThroughIssueDot = {
  key: string
  index: number
  standing: RunThroughIssueStanding
  tone: ProcessStatusTone
  current: boolean
  /** "Issue 3 · Fix it", for its label and hover. */
  label: string
}

/** The issue shown, with its answer. */
export type RunThroughIssueCurrent = {
  row: RunThroughIssueRow
  index: number
  /** Its place counted from 1, as "#3" says it. */
  number: number
  standing: RunThroughIssueStanding
  answer: RunThroughIssueAnswerKind | undefined
  note: string | undefined
}

/** One issue on the answers screen. */
export type RunThroughIssueSummaryRow = {
  row: RunThroughIssueRow
  index: number
  number: number
  standing: RunThroughIssueStanding
  tone: ProcessStatusTone
  /** "Fix it", "Fix · your words", "Not an issue", "Open". */
  badge: string
  note: string | undefined
}

/** The issues answered alike, under one heading: "Fix · 18". */
export type RunThroughIssueSummaryGroup = {
  answer: 'open' | RunThroughIssueAnswerKind
  heading: string
  rows: RunThroughIssueSummaryRow[]
}

/** Going over a run-through's issues one at a time, as the panel draws it. */
export type RunThroughIssueReviewView = {
  total: number
  answered: number
  open: number
  fixes: number
  notIssues: number
  allAnswered: boolean
  /** Where the panel is, held inside the issues. */
  at: RunThroughIssueReviewAt
  /** "Issue 6 of 19", or on the answers "All 19 answered". */
  heading: string
  /** "7 of 19 answered". */
  progress: string
  current: RunThroughIssueCurrent | undefined
  dots: RunThroughIssueDot[]
  /** The answers grouped: open first while any are, then fixes, then not issues. */
  groups: RunThroughIssueSummaryGroup[]
  /** "Fix 18 · Not an issue 1". */
  tally: string
}

/** What the run's sign-off offers for its issues: start going over them, or how that went. */
export type RunThroughIssueReviewEntryView =
  | { kind: 'start'; label: string; count: number }
  | {
      kind: 'reviewed'
      /** "Gone over · 18 fixes · 1 not an issue". */
      line: string
      projectId: string
      storyId: string | undefined
    }
