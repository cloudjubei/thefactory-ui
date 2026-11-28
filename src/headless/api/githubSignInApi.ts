import {
  readOverseerGithubSignIn,
  startGitCredentialGithubSignIn,
  startOverseerGithubSignIn,
} from './generated'
import { SIGN_IN_SESSION_ROUTES } from './signInSessionsApi'
import type { GithubSignInActions, GithubSignInPurpose } from '../utils/githubSignInTypes'

/**
 * The backend's side of a GitHub sign-in for its purpose: a git credential,
 * kept under the label typed when the sign-in is pressed, or the overseer's
 * first repository, whose token is read once its session finished.
 */
export function githubSignInActions(
  purpose: GithubSignInPurpose,
  scopeLabel: () => string = () => '',
): GithubSignInActions {
  const listOpen = SIGN_IN_SESSION_ROUTES.list
  if (purpose === 'bootstrap') {
    return {
      start: async () => (await startOverseerGithubSignIn({ throwOnError: true })).data.session,
      finish: async (sessionId) =>
        (await readOverseerGithubSignIn({ path: { sessionId }, throwOnError: true })).data.tokenId,
      listOpen,
    }
  }
  return {
    start: async () => {
      const label = scopeLabel().trim()
      const body = label ? { scopeLabel: label } : {}
      return (await startGitCredentialGithubSignIn({ body, throwOnError: true })).data.session
    },
    listOpen,
  }
}
