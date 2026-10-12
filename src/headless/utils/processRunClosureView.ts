import {
  PROCESS_FEATURE_CLOSURE_LABELS,
  PROCESS_FEATURE_CLOSURE_STATUSES,
} from 'thefactory-tools/constants'
import { processFeatureClosureProblem } from 'thefactory-tools/utils'
import type {
  ProcessFeatureClosure,
  ProcessFeatureClosureCandidate,
  ProcessFeatureClosureStatus,
} from 'thefactory-tools/types'

import type { ProcessRunClosureOption, ProcessRunClosureRow } from './processRunClosureViewTypes'

/** The rows "Settle its features" starts from: each feature with its suggestion picked. */
export function processRunClosureRows(
  candidates: readonly ProcessFeatureClosureCandidate[],
): ProcessRunClosureRow[] {
  return candidates.map((c) => ({
    featureId: c.featureId,
    title: c.title,
    currentStatus: c.status,
    suggested: c.suggested,
    why: c.why,
    work: c.work,
    status: c.suggested,
    reason: '',
  }))
}

/** The statuses a row can be left as, in the order they are offered. */
export function processRunClosureOptions(): ProcessRunClosureOption[] {
  return PROCESS_FEATURE_CLOSURE_STATUSES.map((status) => ({
    status,
    label: PROCESS_FEATURE_CLOSURE_LABELS[status],
  }))
}

/** The rows with one feature's pick changed. */
export function withProcessRunClosurePick(
  rows: readonly ProcessRunClosureRow[],
  featureId: string,
  pick: { status?: ProcessFeatureClosureStatus; reason?: string },
): ProcessRunClosureRow[] {
  return rows.map((r) => (r.featureId === featureId ? { ...r, ...pick } : r))
}

/** What the rows send: each feature with its pick, and a block's reason. */
export function processRunClosureOfRows(
  rows: readonly ProcessRunClosureRow[],
): ProcessFeatureClosure[] {
  return rows.map((r) => ({
    featureId: r.featureId,
    status: r.status,
    ...(r.status === 'blocked' && r.reason.trim() ? { reason: r.reason.trim() } : {}),
  }))
}

/** Why the rows cannot be sent yet — a block with no reason — or `undefined`. */
export function processRunClosureRowsProblem(
  rows: readonly ProcessRunClosureRow[],
): string | undefined {
  return processFeatureClosureProblem(processRunClosureOfRows(rows), rows)
}
