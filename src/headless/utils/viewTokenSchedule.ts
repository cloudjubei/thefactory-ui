/**
 * When should the App-view consumer re-mint its `viewToken`? Returns the
 * milliseconds-from-`now` to wait before calling
 * `POST /api/v1/projects/:id/view/grant` again. The caller schedules a
 * single `setTimeout(refresh, delay)` and the timer cancels on next
 * mint / unmount.
 *
 * Semantics:
 *   - If the token's expiry sits comfortably in the future, return
 *     `(expiresAt - now) - leadMs` so the refresh fires `leadMs` before
 *     the token expires.
 *   - If we're already inside the lead window (or past expiry), return 0
 *     so the caller re-mints immediately.
 *   - Returns `null` for input the caller should treat as "do nothing"
 *     (unparseable `expiresAt`, negative `leadMs`). Distinct from `0`
 *     ("refresh immediately") so the consumer can tell user error apart
 *     from "we're late."
 */
export interface ComputeRefreshDelayInput {
  expiresAt: string
  leadMs: number
  /** Defaults to `Date.now()`. Override is only for tests / deterministic harnesses. */
  now?: number
}

export function computeRefreshDelayMs(input: ComputeRefreshDelayInput): number | null {
  if (!Number.isFinite(input.leadMs) || input.leadMs < 0) return null
  const exp = Date.parse(input.expiresAt)
  if (Number.isNaN(exp)) return null
  const t = input.now ?? Date.now()
  const remaining = exp - t - input.leadMs
  return remaining > 0 ? remaining : 0
}
