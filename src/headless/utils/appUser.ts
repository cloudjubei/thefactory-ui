import type { AppCurrentUser, AppUserCredential } from './appUserTypes'

function userOf(credential: AppUserCredential): AppCurrentUser | null {
  const username = credential.username.trim()
  const name = username || credential.name.trim()
  if (!name) return null
  const email = credential.email.trim()
  return { name, ...(email ? { email } : {}), ...(username ? { username } : {}) }
}

/**
 * Who the person is, from their stored git credentials: the connected GitHub account
 * (`tokenSource: 'oauth'`) first, else the first credential that names someone. The
 * username is the name — a credential's own `name` is its label ("GitHub OAuth (login)"),
 * used only when it carries no username. `null` when none names anyone.
 */
export function currentUserFromCredentials(
  credentials: readonly AppUserCredential[],
): AppCurrentUser | null {
  const ordered = [
    ...credentials.filter((c) => c.tokenSource === 'oauth'),
    ...credentials.filter((c) => c.tokenSource !== 'oauth'),
  ]
  for (const credential of ordered) {
    const user = userOf(credential)
    if (user) return user
  }
  return null
}
