import type { ProcessRun } from 'thefactory-tools/types'

import {
  REVIEW_BRANCH_STATE_VIEW,
  REVIEW_BRANCH_UPDATES_INPUT_KEY,
  REVIEW_PUSH_APPROVAL_STEP_ID,
} from './colleagueReviewBranchUpdatesConstants'
import type {
  ColleagueReviewBranchRow,
  ColleagueReviewBranchUpdate,
} from './colleagueReviewBranchUpdatesTypes'

const GITHUB_PR = /github\.com\/[^/]+\/([^/]+)\/pull\/(\d+)/

const isUpdate = (value: unknown): value is ColleagueReviewBranchUpdate =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { pullRequestUrl?: unknown }).pullRequestUrl === 'string' &&
  typeof (value as { state?: unknown }).state === 'string' &&
  (value as { state: string }).state in REVIEW_BRANCH_STATE_VIEW

/** How bringing the base into each pull request went, as the run keeps it; anything malformed left out. Pure. */
export function reviewBranchUpdatesOf(
  run: Pick<ProcessRun, 'input'>,
): ColleagueReviewBranchUpdate[] {
  const kept = (run.input ?? {})[REVIEW_BRANCH_UPDATES_INPUT_KEY]
  return Array.isArray(kept) ? kept.filter(isUpdate) : []
}

/** Whether a review run waits for the person to approve pushing a resolution. Pure. */
export function isReviewPushApproval(run: Pick<ProcessRun, 'park' | 'ticketReview'>): boolean {
  return (
    !!run.ticketReview &&
    run.park?.reason === 'gate' &&
    run.park.stepId === REVIEW_PUSH_APPROVAL_STEP_ID
  )
}

/** One pull request's row on the push approval: its name, state, files, changes and checks. Pure. */
export function reviewBranchRow(update: ColleagueReviewBranchUpdate): ColleagueReviewBranchRow {
  const parsed = GITHUB_PR.exec(update.pullRequestUrl)
  const view = REVIEW_BRANCH_STATE_VIEW[update.state]
  const checks = (update.checks ?? []).map((c) => ({
    label: c.label,
    summary: c.summary,
    passed: c.status === 'passed',
  }))
  return {
    url: update.pullRequestUrl,
    name: parsed ? `${parsed[1]} #${parsed[2]}` : update.pullRequestUrl,
    stateLabel: view.label,
    tone: view.tone,
    ...(update.detail ? { detail: update.detail } : {}),
    ...(update.baseBranch && update.headBranch
      ? { branches: `${update.baseBranch} into ${update.headBranch}` }
      : {}),
    files: update.conflictedFiles ?? [],
    ...(update.diffStat ? { diffStat: update.diffStat } : {}),
    ...(update.diff ? { diff: update.diff } : {}),
    checks,
    ...(update.checksPassed !== undefined ? { checksPassed: update.checksPassed } : {}),
  }
}

/** The push approval's rows: every pull request, the ones resolved first. Pure. */
export function reviewPushApprovalRows(run: Pick<ProcessRun, 'input'>): ColleagueReviewBranchRow[] {
  const updates = reviewBranchUpdatesOf(run)
  return [
    ...updates.filter((u) => u.state === 'resolved'),
    ...updates.filter((u) => u.state !== 'resolved'),
  ].map(reviewBranchRow)
}

/** A diff's lines with how each reads: added, removed, a hunk head, or context. Pure. */
export function diffLineKinds(
  diff: string,
): { text: string; kind: 'add' | 'del' | 'hunk' | 'ctx' }[] {
  return diff.split('\n').map((text) => ({
    text,
    kind: text.startsWith('@@')
      ? 'hunk'
      : text.startsWith('+') && !text.startsWith('+++')
        ? 'add'
        : text.startsWith('-') && !text.startsWith('---')
          ? 'del'
          : 'ctx',
  }))
}

/** The round a review run is on: its review's latest, never before the one it started on. Pure. */
export function reviewRunRound(
  review: { rounds: readonly { n: number }[] } | null | undefined,
  subject: { round: number } | undefined,
): number | undefined {
  if (!subject) return undefined
  return Math.max(subject.round, ...(review?.rounds ?? []).map((r) => r.n))
}
