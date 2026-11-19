import type { ProcessRun } from 'thefactory-tools/types'
import { checkBaselineLine } from 'thefactory-tools/utils'

import {
  REVIEW_BRANCH_STATE_VIEW,
  REVIEW_BRANCH_UPDATES_INPUT_KEY,
  REVIEW_PUSH_APPROVAL_STEP_ID,
  REVIEW_PUSH_BASE_FAILURE_TONE,
  REVIEW_PUSH_BASE_LABELS,
  REVIEW_PUSH_CHECK_TONES,
  REVIEW_PUSH_COPY,
  REVIEW_PUSH_UNNAMED_BASE,
} from './colleagueReviewBranchUpdatesConstants'
import type {
  ColleagueReviewBranchCheck,
  ColleagueReviewBranchCheckRow,
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

const failsAtBase = (check: ColleagueReviewBranchCheck) =>
  check.status === 'failed' && check.baseline?.verdict === 'pre-existing'

function branchCheckRow(
  check: ColleagueReviewBranchCheck,
  base: string,
): ColleagueReviewBranchCheckRow {
  const failed = check.status === 'failed' || check.status === 'error'
  const baseline = failed ? check.baseline : undefined
  const baseDetail = baseline
    ? checkBaselineLine({
        baseline: {
          sha: baseline.sha,
          verdict: baseline.verdict,
          ...(baseline.reason ? { reason: baseline.reason } : {}),
        },
      })
    : undefined
  return {
    label: check.label,
    summary: check.summary,
    passed: check.status === 'passed',
    tone: failsAtBase(check)
      ? REVIEW_PUSH_BASE_FAILURE_TONE
      : (REVIEW_PUSH_CHECK_TONES[check.status] ?? 'stuck'),
    ...(baseline ? { baseLabel: REVIEW_PUSH_BASE_LABELS[baseline.verdict](base) } : {}),
    ...(baseDetail ? { baseDetail } : {}),
    ...(failed && check.outputTail ? { outputTail: check.outputTail } : {}),
  }
}

function listed(labels: readonly string[]): string {
  return labels.length > 1
    ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
    : (labels[0] ?? '')
}

function checksVerdict(
  update: ColleagueReviewBranchUpdate,
  base: string,
): Pick<ColleagueReviewBranchRow, 'checksBadge' | 'checksNote'> {
  if (update.checksPassed === undefined) return {}
  if (!update.checksPassed) {
    return { checksBadge: { label: REVIEW_PUSH_COPY.checksFailed, tone: 'stuck' } }
  }
  const shared = (update.checks ?? []).filter(failsAtBase).map((c) => c.label)
  if (shared.length === 0) {
    return { checksBadge: { label: REVIEW_PUSH_COPY.checksPassed, tone: 'done' } }
  }
  return {
    checksBadge: {
      label: REVIEW_PUSH_COPY.checksFailOnBase(base),
      tone: REVIEW_PUSH_BASE_FAILURE_TONE,
    },
    checksNote: REVIEW_PUSH_COPY.checksBaseNote(listed(shared), shared.length > 1, base),
  }
}

/** One pull request's row on the push approval: its name, state, files, changes and checks, each failure compared with the base. Pure. */
export function reviewBranchRow(update: ColleagueReviewBranchUpdate): ColleagueReviewBranchRow {
  const parsed = GITHUB_PR.exec(update.pullRequestUrl)
  const view = REVIEW_BRANCH_STATE_VIEW[update.state]
  const base = update.baseBranch ?? REVIEW_PUSH_UNNAMED_BASE
  const checks = (update.checks ?? []).map((c) => branchCheckRow(c, base))
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
    ...checksVerdict(update, base),
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

/** A diff of several files as one patch per file, each under the path it changes. Pure. */
export function diffFiles(diff: string): { path: string; patch: string }[] {
  const parts = diff.split(/^(?=diff --git )/m).filter((part) => part.trim())
  return parts.map((patch) => {
    const head = /^diff --git a\/(.+?) b\/(.+)$/m.exec(patch)
    const plus = /^\+\+\+ b\/(.+)$/m.exec(patch)
    return { path: head?.[2] ?? plus?.[1] ?? '', patch }
  })
}

/** The round a review run is on: its review's latest, never before the one it started on. Pure. */
export function reviewRunRound(
  review: { rounds: readonly { n: number }[] } | null | undefined,
  subject: { round: number } | undefined,
): number | undefined {
  if (!subject) return undefined
  return Math.max(subject.round, ...(review?.rounds ?? []).map((r) => r.n))
}
