import { GIT_CREDENTIAL_HOST_UNKNOWN } from './gitCredentialConstants'

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * Reduce whatever a user (or a writer) put in `host` to the bare host that
 * identifies a git remote — `dev.azure.com`, `github.com`, `gitlab.internal:8443`
 * — or `undefined` when there is nothing usable there.
 *
 * The URL shapes are tolerated because people paste remote URLs into a field
 * labelled "Host". Stripping userinfo matters beyond tidiness: a pasted
 * `https://user:ghp_token@github.com/...` would otherwise persist and render a
 * live token.
 */
export function normalizeGitCredentialHost(host?: string | null): string | undefined {
  if (typeof host !== 'string') return undefined

  let value = host.trim().replace(SCHEME, '')
  const at = value.lastIndexOf('@')
  if (at >= 0) value = value.slice(at + 1)
  value = value.split(/[/?#]/)[0] ?? ''

  const colon = value.indexOf(':')
  if (colon >= 0 && !/^\d+$/.test(value.slice(colon + 1))) value = value.slice(0, colon)

  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : undefined
}

/**
 * The host as shown in the credentials list — the line that tells an Azure
 * DevOps credential apart from a GitHub one. Records written before `host`
 * existed have none, so the fallback is a sentence: a blank cell reads as a
 * bug, and the raw value must never reach the page as `undefined`.
 */
export function formatGitCredentialHost(host?: string | null): string {
  return normalizeGitCredentialHost(host) ?? GIT_CREDENTIAL_HOST_UNKNOWN
}
