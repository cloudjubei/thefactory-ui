import { isGitCredentialError } from '../api/helpers'
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
