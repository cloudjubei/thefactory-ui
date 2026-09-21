/**
 * Whether a run's panel should show "Verifying…" / "still capturing".
 *
 * This is the single source of truth for the panel's in-flight state. It exists
 * because the naive form claimed a PROCESS-OWNED run was verifying forever: the
 * process's own `verify` step owns verification, but a lingering `reviewRunId` on
 * the run's record made this panel show "Verifying…"/"capturing" indefinitely —
 * screens stuck "capturing…" with their thumbnails disabled, and a false "Agent
 * working" bar long after the step was done. A process-owned run never verifies
 * here.
 *
 * So a run is verifying ONLY when it is NOT process-owned, has a linked verifier,
 * has no verdict yet, and that verifier's run is non-terminal
 * (`reviewRunTerminal === false`). `undefined` means unknown (the initial state,
 * before the verifier's status is read) and reads as not-in-progress.
 */
export interface ReviewInProgressInput {
  /** Set when this run belongs to a process — its verification is the pipeline's own step. */
  processRunId: string | undefined
  /** The linked auto-review verifier run, if any. */
  reviewRunId: string | undefined
  /** A recorded verdict ends any "in progress". */
  verdict: unknown
  /** The verifier run's terminal state: `true` terminal, `false` CONFIRMED running, `undefined` unknown. */
  reviewRunTerminal: boolean | undefined
}

export function isReviewInProgress(input: ReviewInProgressInput): boolean {
  if (input.processRunId !== undefined) return false
  if (!input.reviewRunId) return false
  if (input.verdict) return false
  return input.reviewRunTerminal === false
}
