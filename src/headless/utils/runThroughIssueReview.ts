import type { ProcessRun } from 'thefactory-tools/types'

import type { RunThroughIssueAnswer, RunThroughIssueAnswerKind } from '../api/generated'
import type { ProcessRunEvidenceGroupView } from './processVariantViewTypes'
import { runThroughReport } from './runThroughReport'
import {
  RUN_THROUGH_ISSUE_CHOICES,
  RUN_THROUGH_ISSUE_STANDING_BADGE,
  RUN_THROUGH_ISSUE_STANDING_TONE,
  RUN_THROUGH_REVIEW_COPY,
} from './runThroughIssueReviewConstants'
import type {
  RunThroughIssueAnswers,
  RunThroughIssueReviewAt,
  RunThroughIssueReviewEntryView,
  RunThroughIssueReviewKeyAction,
  RunThroughIssueReviewView,
  RunThroughIssueStanding,
  RunThroughIssueSummaryGroup,
  RunThroughIssueSummaryRow,
} from './runThroughIssueReviewTypes'
import type { RunThroughIssueRow, RunThroughReportView } from './runThroughReportTypes'

type Keyed = Pick<RunThroughIssueRow, 'key'>

function noteOf(answer: RunThroughIssueAnswer | undefined): string | undefined {
  const note = answer?.note?.trim()
  return note ? note : undefined
}

/** How an issue stands under its answer: a fix with the person's words is a reply. Pure. */
export function runThroughIssueStanding(
  answer: RunThroughIssueAnswer | undefined,
): RunThroughIssueStanding {
  if (!answer) return 'open'
  if (answer.answer === 'not-an-issue') return 'not-an-issue'
  return noteOf(answer) ? 'reply' : 'fix'
}

/** The answers with one more given — a later answer replaces the earlier. Pure. */
export function withRunThroughIssueAnswer(
  answers: RunThroughIssueAnswers,
  issueId: string,
  answer: RunThroughIssueAnswerKind,
  note: string | undefined,
  at: number,
): RunThroughIssueAnswers {
  const words = note?.trim()
  return { ...answers, [issueId]: { issueId, answer, ...(words ? { note: words } : {}), at } }
}

/** Whether `answer` with `note` is the answer already given — giving it again changes nothing. Pure. */
export function isSameRunThroughIssueAnswer(
  given: RunThroughIssueAnswer | undefined,
  answer: RunThroughIssueAnswerKind,
  note: string | undefined,
): boolean {
  return given?.answer === answer && noteOf(given) === (note?.trim() || undefined)
}

/** The first issue still open, or the answers when none is. Pure. */
export function runThroughIssueReviewFirstAt(
  issues: readonly Keyed[],
  answers: RunThroughIssueAnswers,
): RunThroughIssueReviewAt {
  const index = issues.findIndex((row) => !answers[row.key])
  return index === -1 ? 'summary' : index
}

/**
 * Where answering the issue at `index` moves to: the next open issue after it,
 * round to the first, or the answers once none is open. Pure.
 */
export function runThroughIssueReviewAfter(
  issues: readonly Keyed[],
  answers: RunThroughIssueAnswers,
  index: number,
): RunThroughIssueReviewAt {
  for (let step = 1; step < issues.length; step++) {
    const next = (index + step) % issues.length
    if (!answers[issues[next]!.key]) return next
  }
  return 'summary'
}

/** Back or Next from `at`: Next past the last issue is the answers, Back from them the last issue. Pure. */
export function runThroughIssueReviewStep(
  total: number,
  at: RunThroughIssueReviewAt,
  by: 1 | -1,
): RunThroughIssueReviewAt {
  if (total === 0) return 'summary'
  if (at === 'summary') return by === -1 ? total - 1 : 'summary'
  const next = at + by
  if (next >= total) return 'summary'
  return Math.max(0, next)
}

/** What a key does in the panel: 1, 2 and 3 answer, the arrows move; anything else nothing. Pure. */
export function runThroughIssueReviewKey(key: string): RunThroughIssueReviewKeyAction | undefined {
  const choice = RUN_THROUGH_ISSUE_CHOICES.find((c) => c.key === key)
  if (choice) return { kind: 'answer', choice: choice.id }
  if (key === 'ArrowRight') return { kind: 'move', by: 1 }
  if (key === 'ArrowLeft') return { kind: 'move', by: -1 }
  return undefined
}

function heldAt(total: number, at: RunThroughIssueReviewAt): RunThroughIssueReviewAt {
  if (at === 'summary' || total === 0) return 'summary'
  return Math.min(Math.max(0, Math.trunc(at)), total - 1)
}

function summaryRow(
  row: RunThroughIssueRow,
  index: number,
  answer: RunThroughIssueAnswer | undefined,
): RunThroughIssueSummaryRow {
  const standing = runThroughIssueStanding(answer)
  return {
    row,
    index,
    number: index + 1,
    standing,
    tone: RUN_THROUGH_ISSUE_STANDING_TONE[standing],
    badge: RUN_THROUGH_ISSUE_STANDING_BADGE[standing],
    note: noteOf(answer),
  }
}

/**
 * Going over a run-through's issues one at a time, as the panel draws it: the
 * issue at `at` with its answer, a dot per issue coloured by how it stands,
 * how many are answered, and the answers grouped for the last screen — open
 * first while any are, then the fixes, then what is not an issue. Answers to
 * issues no longer listed are not counted. Pure.
 */
export function runThroughIssueReviewView(
  issues: readonly RunThroughIssueRow[],
  answers: RunThroughIssueAnswers,
  at: RunThroughIssueReviewAt,
): RunThroughIssueReviewView {
  const total = issues.length
  const where = heldAt(total, at)
  const rows = issues.map((row, index) => summaryRow(row, index, answers[row.key]))
  const count = (standing: RunThroughIssueStanding) =>
    rows.filter((r) => r.standing === standing).length
  const open = count('open')
  const fixes = count('fix') + count('reply')
  const notIssues = count('not-an-issue')
  const answered = total - open
  const shown = where === 'summary' ? undefined : rows[where]
  const answerOf = (row: RunThroughIssueRow) => answers[row.key]
  const groups: RunThroughIssueSummaryGroup[] = (['open', 'fix', 'not-an-issue'] as const)
    .map((answer) => {
      const grouped = rows.filter((r) =>
        answer === 'open'
          ? r.standing === 'open'
          : answer === 'fix'
            ? r.standing === 'fix' || r.standing === 'reply'
            : r.standing === 'not-an-issue',
      )
      return {
        answer,
        heading: RUN_THROUGH_REVIEW_COPY.group(
          RUN_THROUGH_REVIEW_COPY.groupLabel[answer],
          grouped.length,
        ),
        rows: grouped,
      }
    })
    .filter((group) => group.rows.length > 0)
  return {
    total,
    answered,
    open,
    fixes,
    notIssues,
    allAnswered: total > 0 && open === 0,
    at: where,
    heading:
      where === 'summary'
        ? open === 0
          ? RUN_THROUGH_REVIEW_COPY.allAnswered(total)
          : RUN_THROUGH_REVIEW_COPY.answersHeading
        : RUN_THROUGH_REVIEW_COPY.heading(where + 1, total),
    progress: RUN_THROUGH_REVIEW_COPY.progress(answered, total),
    current: shown
      ? {
          row: shown.row,
          index: shown.index,
          number: shown.number,
          standing: shown.standing,
          answer: answerOf(shown.row)?.answer,
          note: shown.note,
        }
      : undefined,
    dots: rows.map((r) => ({
      key: r.row.key,
      index: r.index,
      standing: r.standing,
      tone: r.tone,
      current: r.index === where,
      label: RUN_THROUGH_REVIEW_COPY.dot(r.number, r.badge),
    })),
    groups,
    tally: RUN_THROUGH_REVIEW_COPY.tally(fixes, notIssues),
  }
}

/**
 * What a run's sign-off offers for its run-through's issues: once gone over,
 * how that went and the story it made; while the run waits at a gate with
 * issues, the way into going over them. Nothing otherwise. Pure.
 */
export function runThroughIssueReviewEntry(
  run: Pick<ProcessRun, 'projectId' | 'status' | 'park' | 'issueReview'> | undefined,
  issueCount: number,
): RunThroughIssueReviewEntryView | undefined {
  if (!run) return undefined
  const review = run.issueReview
  if (review) {
    return {
      kind: 'reviewed',
      line: RUN_THROUGH_REVIEW_COPY.reviewed(review.fixes, review.notIssues),
      projectId: review.projectId,
      storyId: review.storyId,
    }
  }
  if (run.status !== 'parked' || run.park?.reason !== 'gate' || issueCount === 0) return undefined
  return { kind: 'start', label: RUN_THROUGH_REVIEW_COPY.start(issueCount), count: issueCount }
}

/** A run's run-through from what its runs filed, for a sign-off with no story. Pure. */
export function runThroughReportOfRun(
  groups: readonly Pick<ProcessRunEvidenceGroupView, 'tiles'>[],
): RunThroughReportView | undefined {
  const tiles = groups.flatMap((group) => group.tiles)
  return runThroughReport(tiles, tiles)
}
