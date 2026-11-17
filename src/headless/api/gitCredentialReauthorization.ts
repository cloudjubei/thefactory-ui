import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
let ids: readonly string[] = []
const empty: readonly string[] = []

/** A git-provider refusal is not a refusal of the app's bearer token. */
export function isGitReauthorizationResponse(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const response = (err as { response?: { status?: unknown; data?: unknown } }).response
  if (response?.status !== 401 || !response.data || typeof response.data !== 'object') return false
  return (response.data as { reason?: unknown }).reason === 're-authorize'
}

export function recordGitReauthorization(err: unknown): void {
  if (!isGitReauthorizationResponse(err)) return
  const id = (err as { response: { data: { credentialId?: unknown } } }).response.data.credentialId
  if (typeof id !== 'string' || !id || ids.includes(id)) return
  ids = [...ids, id]
  listeners.forEach((listener) => listener())
}

/** Only an actual credential replacement/deletion clears a refusal, not a list refresh. */
export function clearGitReauthorization(id?: string): void {
  const next = id === undefined ? empty : ids.filter((value) => value !== id)
  if (next.length === ids.length) return
  ids = next
  listeners.forEach((listener) => listener())
}

export function useGitReauthorizationIds(): readonly string[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => ids,
    () => empty,
  )
}
