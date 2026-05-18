// SDK-independent boundary helpers shared between web's hey-api client and
// any other consumer of `thefactory-backend`. The narrower SDK-typed helpers
// (`isTestRun`, `isCoverage`, `isGrepHit`) stay co-located with the generated
// client in each consumer for now and lift once the SDK itself does.

/**
 * Several git endpoints wrap their data in a per-call envelope:
 *
 *     ({ ok: true, ... } | { ok: false, error })
 *
 * The actual payload sits under one of several keys (`status`, `branches`,
 * `stashes`, …). We throw the server's error message on `ok: false` so a
 * failure can never silently surface as an empty list, and fall back to a
 * caller-provided default when the field is missing on a successful
 * response (the upstream tools sometimes omit it).
 */
export function unwrapGitEnvelope<T extends { ok: boolean; error?: string }, K extends keyof T>(
  envelope: T,
  field: K,
  fallback: NonNullable<T[K]>,
): NonNullable<T[K]> {
  if (envelope.ok === false) {
    throw new Error(envelope.error ?? 'Git operation failed')
  }
  const value = envelope[field]
  return (value ?? fallback) as NonNullable<T[K]>
}

/**
 * Pull `response.data.message` out of an unknown thrown by an SDK call made
 * with `throwOnError: true`. Walks the structure with `unknown` narrowing so
 * consumers don't have to import axios types.
 */
export function getResponseDataMessage(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const response = (err as { response?: unknown }).response
  if (!response || typeof response !== 'object') return undefined
  const data = (response as { data?: unknown }).data
  if (!data || typeof data !== 'object') return undefined
  const message = (data as { message?: unknown }).message
  return typeof message === 'string' ? message : undefined
}

/**
 * Structured view of an SDK error shaped by the backend's standard error
 * envelope:
 *   - `{ error }`                                       on 4xx
 *   - `{ error, code: 'INTERNAL_ERROR', requestId }`    on 5xx
 *
 * UIs that surface errors should prefer `message` for the headline and tack
 * `requestId` on as a copy-able grep handle when present.
 */
export interface ServerError {
  message: string
  code?: string
  requestId?: string
}

export function extractServerError(err: unknown, fallback = 'Request failed'): ServerError {
  if (err && typeof err === 'object') {
    const data = (err as { response?: { data?: unknown } }).response?.data
    if (data && typeof data === 'object') {
      const d = data as { error?: unknown; message?: unknown; code?: unknown; requestId?: unknown }
      const message =
        (typeof d.error === 'string' && d.error) ||
        (typeof d.message === 'string' && d.message) ||
        undefined
      if (message) {
        return {
          message,
          ...(typeof d.code === 'string' ? { code: d.code } : {}),
          ...(typeof d.requestId === 'string' ? { requestId: d.requestId } : {}),
        }
      }
    }
  }
  if (err instanceof Error && err.message) return { message: err.message }
  if (typeof err === 'string' && err.length > 0) return { message: err }
  return { message: fallback }
}
