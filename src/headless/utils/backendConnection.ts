import type { BackendTestLine, BackendTestState } from './backendConnectionTypes'

/** A backend URL as it is saved: no surrounding spaces, no trailing slashes. */
export function normalizeBackendUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

/** The URL "Test connection" checks: the one being typed, else the saved one. */
export function backendTestCandidate(nextUrl: string, currentUrl: string | null): string | null {
  const candidate = normalizeBackendUrl(nextUrl) || normalizeBackendUrl(currentUrl ?? '')
  return candidate.length > 0 ? candidate : null
}

/** The line shown once a test has finished; `null` before and during one. */
export function backendTestLine(state: BackendTestState): BackendTestLine | null {
  if (state.kind === 'ok') {
    return {
      tone: 'ok',
      text: `Reachable: version ${state.version}, uptime ${Math.round(state.uptime)}s.`,
    }
  }
  if (state.kind === 'error') return { tone: 'error', text: state.message }
  return null
}
