/**
 * Body for `POST /cli-runs/:runId/verify`.
 *
 * With `checkIds`, the route runs only those checks. Without it, the route
 * runs the whole pass — the call the sign-off already made.
 *
 * The generated client still types that body as `projectId` and `reason`.
 * `checkIds` is carried here and asserted into the generated body at the
 * call, so a route that accepts it receives the ids.
 */
export type VerifyReviewBody = {
  projectId: string
  checkIds?: string[]
}

export function verifyReviewBody(
  projectId: string,
  checkIds: readonly string[] | undefined,
): VerifyReviewBody {
  const ids = [...new Set((checkIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0))]
  return ids.length > 0 ? { projectId, checkIds: ids } : { projectId }
}
