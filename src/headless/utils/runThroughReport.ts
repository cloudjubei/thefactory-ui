import { formatVideoTime } from 'thefactory-tools/utils'

import type { ReviewEvidenceRef } from '../api/generated'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import { RUN_THROUGH_PROOF_STATUS, RUN_THROUGH_TEXT } from './runThroughReportConstants'
import type {
  RunThroughIssueRow,
  RunThroughIssueTile,
  RunThroughRecordSections,
  RunThroughRecordView,
  RunThroughReportView,
  RunThroughState,
} from './runThroughReportTypes'
import {
  CODE_REVIEW_SEVERITIES,
  CODE_REVIEW_SEVERITY_PLURAL,
  CODE_REVIEW_SEVERITY_TONE,
} from './signoffCodeReviewConstants'

/** A run-through's own filing: the record it ended with, or an issue it flagged. Pure. */
export function isRunThroughFiling(
  ref: Pick<ReviewEvidenceRef, 'runThroughSections' | 'issue'>,
): boolean {
  return ref.runThroughSections !== undefined || ref.issue !== undefined
}

/** Every filing but a run-through's — what the other tabs show. Pure. */
export function withoutRunThroughFilings<T extends Pick<EvidenceTile, 'ref'>>(
  tiles: readonly T[],
): T[] {
  return tiles.filter((t) => !isRunThroughFiling(t.ref))
}

function newest<T extends Pick<EvidenceTile, 'ref'>>(tiles: readonly T[]): T | undefined {
  return tiles.reduce<T | undefined>(
    (best, t) => (!best || t.ref.createdAt > best.ref.createdAt ? t : best),
    undefined,
  )
}

function isIssue(t: EvidenceTile): t is RunThroughIssueTile {
  return t.ref.issue !== undefined
}

function severityRank(t: RunThroughIssueTile): number {
  return CODE_REVIEW_SEVERITIES.indexOf(t.ref.issue.severity)
}

function byWorstFirst(a: RunThroughIssueTile, b: RunThroughIssueTile): number {
  const at = (t: RunThroughIssueTile) => t.ref.issue.at ?? Number.POSITIVE_INFINITY
  return severityRank(a) - severityRank(b) || at(a) - at(b) || a.ref.createdAt - b.ref.createdAt
}

function issueRow(t: RunThroughIssueTile): RunThroughIssueRow {
  const { issue } = t.ref
  return {
    key: t.ref.id,
    severity: issue.severity,
    tone: CODE_REVIEW_SEVERITY_TONE[issue.severity],
    title: issue.title,
    happened: issue.happened,
    expected: issue.expected,
    doing: issue.doing,
    view: issue.view,
    atSec: issue.at,
    time: issue.at === undefined ? undefined : formatVideoTime(issue.at),
    screenshot: t.ref.kind === 'screenshot' ? t : undefined,
  }
}

function issuesSummary(rows: readonly RunThroughIssueRow[]): string {
  const parts = CODE_REVIEW_SEVERITIES.flatMap((s) => {
    const n = rows.filter((r) => r.severity === s).length
    return n > 0 ? [`${n} ${CODE_REVIEW_SEVERITY_PLURAL[s][n === 1 ? 0 : 1]}`] : []
  })
  return parts.length > 0 ? parts.join(' · ') : RUN_THROUGH_TEXT.noIssues
}

function recordView(sections: RunThroughRecordSections): RunThroughRecordView {
  return {
    scenario: sections.scenario,
    reachedEnd: sections.reachedEnd,
    endLine: sections.reachedEnd
      ? RUN_THROUGH_TEXT.reachedEnd
      : sections.stoppedAt
        ? RUN_THROUGH_TEXT.stoppedAt(sections.stoppedAt)
        : RUN_THROUGH_TEXT.stoppedShort,
    summary: sections.summary,
  }
}

function stateOf(
  record: RunThroughRecordView | undefined,
  rows: readonly RunThroughIssueRow[],
): RunThroughState {
  if (record?.reachedEnd === false || rows.some((r) => r.severity === 'blocker')) return 'failed'
  if (rows.some((r) => r.severity === 'major' || r.severity === 'minor')) return 'flagged'
  return 'passed'
}

function proofText(
  sections: RunThroughRecordSections | undefined,
  rows: readonly RunThroughIssueRow[],
): string {
  const issues = rows.length > 0 ? issuesSummary(rows) : RUN_THROUGH_TEXT.proofNoIssues
  if (!sections) return `${RUN_THROUGH_TEXT.label}: ${issues}`
  const where = sections.reachedEnd
    ? RUN_THROUGH_TEXT.proofEnd
    : sections.stoppedAt
      ? RUN_THROUGH_TEXT.proofStopped(sections.stoppedAt)
      : RUN_THROUGH_TEXT.stoppedShort.toLowerCase()
  return `${RUN_THROUGH_TEXT.label}: ${where} — ${issues}`
}

/**
 * A run-through's tab, from what it filed: the newest record, the issues its
 * run flagged worst first — a severity's timed ones in the order they
 * happened — and the newest recording of that run, for its moments. Issues
 * flagged before any record still show. Absent when nothing of one was filed.
 * Pure.
 */
export function runThroughReport(
  filings: readonly EvidenceTile[],
  recordings: readonly EvidenceTile[],
): RunThroughReportView | undefined {
  const recordTile = newest(filings.filter((t) => t.ref.runThroughSections !== undefined))
  const runId = recordTile?.ref.runId
  const issues = filings.filter(isIssue).filter((t) => runId === undefined || t.ref.runId === runId)
  if (!recordTile && issues.length === 0) return undefined
  const sections = recordTile?.ref.runThroughSections
  const record = sections ? recordView(sections) : undefined
  const rows = [...issues].sort(byWorstFirst).map(issueRow)
  const state = stateOf(record, rows)
  return {
    record,
    issues: rows,
    issuesSummary: issuesSummary(rows),
    state,
    proof: { text: proofText(sections, rows), status: RUN_THROUGH_PROOF_STATUS[state] },
    recording:
      runId === undefined
        ? undefined
        : newest(recordings.filter((t) => t.ref.kind === 'recording' && t.ref.runId === runId)),
  }
}

/** Where a moment sits along a recording of `durationSec`, as a percentage; absent until both are known. Pure. */
export function runThroughTickPercent(
  atSec: number | undefined,
  durationSec: number,
): number | undefined {
  if (atSec === undefined || !Number.isFinite(durationSec) || durationSec <= 0) return undefined
  return Math.min(100, Math.max(0, (atSec / durationSec) * 100))
}
