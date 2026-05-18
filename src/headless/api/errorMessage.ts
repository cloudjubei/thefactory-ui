// Pull a human-readable error message out of a failed backend call. Walks
// the unknown thrown by SDK calls so the lift doesn't take a hard dep on
// `axios` types — both web's hey-api client and any other transport that
// rejects with `{ response: { status, data: { error } } }` work the same.

interface AxiosLikeError {
  isAxiosError?: boolean
  code?: string
  response?: {
    status?: number
    data?: { error?: unknown }
  }
}

function asAxiosLike(err: unknown): AxiosLikeError | null {
  if (!err || typeof err !== 'object') return null
  if (!('isAxiosError' in err)) return null
  return err as AxiosLikeError
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  const ax = asAxiosLike(err)
  if (ax) {
    const fromBody = ax.response?.data?.error
    if (typeof fromBody === 'string' && fromBody.trim().length > 0) return fromBody.trim()
    const status = ax.response?.status
    if (status === 401)
      return 'Not authorized. Check the backend bearer token in Developer settings.'
    if (status === 403) return 'Forbidden: the backend rejected this request.'
    if (status === 404) return 'Not found on the backend.'
    if (status === 408 || ax.code === 'ECONNABORTED') return 'The backend took too long to respond.'
    if (status === 502 || status === 503 || status === 504) {
      return 'The backend is temporarily unavailable. Try again in a moment.'
    }
    if (!ax.response) {
      return 'Could not reach the backend. Check that it is running and reachable.'
    }
  }
  if (err instanceof Error && err.message && err.message.trim().length > 0) return err.message
  if (typeof err === 'string' && err.length > 0) return err
  return fallback
}
