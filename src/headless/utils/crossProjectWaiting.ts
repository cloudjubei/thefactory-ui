import type { FeatureRequestStatus } from 'thefactory-tools/types'

/** The subset of a live `FeatureRequest` the waiting bar needs — the full record is assignable. */
export interface CrossProjectWaitingRequest {
  id: string
  /** The receiving project (B) this chat is blocked on. */
  targetProjectId: string
  status: FeatureRequestStatus
  /** A → B → A deadlock flagged at emit (D.5). */
  cycleFlag?: { detected?: boolean }
}

export type CrossProjectWaitingTone = 'waiting' | 'cycle'

/** One in-flight request feeding the bar's per-target status pills. */
export interface CrossProjectWaitingItem {
  id: string
  targetProjectId: string
  status: FeatureRequestStatus
}

/** View-model for the bar that replaces a chat's composer while it waits on another project. */
export interface CrossProjectWaitingView {
  /** Number of distinct target projects this chat is blocked on. */
  count: number
  /** Distinct target project ids, first-seen order. */
  targets: string[]
  /** At least one waiting request flagged a deadlock cycle. */
  cycle: boolean
  tone: CrossProjectWaitingTone
  /** One-line headline for the bar. */
  title: string
  /** One row per in-flight request. */
  items: CrossProjectWaitingItem[]
}

/**
 * Build the "Waiting on «B»…" view-model from the open requests a chat emitted
 * (`useCrossProjectRequests().waitingForChat(context)`). Returns `null` when nothing is in flight,
 * so the caller falls back to the normal composer. The headline counts distinct *target projects*
 * (multiple requests to the same B collapse into one), and a flagged cycle escalates the tone.
 */
export function summarizeCrossProjectWaiting(
  requests: CrossProjectWaitingRequest[],
): CrossProjectWaitingView | null {
  if (requests.length === 0) return null

  const targets: string[] = []
  for (const r of requests) {
    if (!targets.includes(r.targetProjectId)) targets.push(r.targetProjectId)
  }

  const cycle = requests.some((r) => r.cycleFlag?.detected === true)
  const count = targets.length
  const subject = count === 1 ? targets[0] : `${count} projects`
  const title = cycle ? `Waiting on ${subject} — possible deadlock` : `Waiting on ${subject}`

  return {
    count,
    targets,
    cycle,
    tone: cycle ? 'cycle' : 'waiting',
    title,
    items: requests.map((r) => ({
      id: r.id,
      targetProjectId: r.targetProjectId,
      status: r.status,
    })),
  }
}
