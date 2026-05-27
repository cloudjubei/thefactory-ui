/**
 * Tiny utilities used by every project-scoped SWR refresh. Lives here
 * (not inline per-context) so the pattern stays one diff to apply:
 *
 *   1. Pass `acceptOkOr304` as `validateStatus` so axios doesn't throw on
 *      a cache-hit 304. Harmless when the BE doesn't yet emit ETags.
 *   2. Pull the response ETag via `readEtagHeader` and stash it on
 *      `ProjectResourceCache.set(projectId, data, etag)`.
 */

export const acceptOkOr304 = (status: number) =>
  status === 304 || (status >= 200 && status < 300)

export function readEtagHeader(headers: unknown): string | null {
  if (!headers || typeof headers !== 'object') return null
  const h = headers as Record<string, unknown>
  const v = h.etag ?? h.ETag
  return typeof v === 'string' ? v : null
}

/** Hard upper bound for a project-scoped revalidate. A stuck backend
 *  handler (or a wedged TCP connection) gets cut off after this many ms
 *  and the spinner clears with a load error — preferable to spinning
 *  forever. */
export const REVALIDATE_TIMEOUT_MS = 20_000
