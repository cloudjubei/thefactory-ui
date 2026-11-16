import { isGitCredentialError } from '../api/helpers'
import { REMOTE_GIT_OP_LABELS } from './gitOpErrorConstants'
import type { GitOpError } from './gitOpErrorTypes'

/**
 * Holds a failed git op for display: the `message` the screen already shows,
 * plus whether the error itself (not the words) says the git credentials were
 * refused, which offers "Update credentials" beside it.
 */
export function gitOpError(err: unknown, message: string): GitOpError {
  return { message, credential: isGitCredentialError(err) }
}

/**
 * A failed Git-screen op as the screen holds it. Only an op that reaches the
 * remote can be fixed with new credentials, so a local op never offers them,
 * whatever its error says.
 */
export function remoteGitOpError(label: string, err: unknown, message: string): GitOpError {
  const error = gitOpError(err, message)
  return REMOTE_GIT_OP_LABELS.has(label) ? error : { ...error, credential: false }
}

/**
 * The host's way to its git credentials settings, bound to the active project.
 * Undefined when the host gave none or no project is active, so screens hide
 * the button instead of offering one that goes nowhere.
 */
export function credentialSettingsOpener(
  open: ((projectId: string) => void) | undefined,
  projectId: string | undefined,
): (() => void) | undefined {
  if (!open || !projectId) return undefined
  return () => open(projectId)
}
