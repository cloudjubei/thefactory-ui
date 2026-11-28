import type { SignInSessionState } from 'thefactory-tools/types'

/** What a GitHub sign-in is for: a git credential kept by the backend, or the overseer's first repository. */
export type GithubSignInPurpose = 'git-credential' | 'bootstrap'

/**
 * Where a GitHub sign-in stands here. `open` holds the session the app shows;
 * `finishing` reads what a finished sign-in left; `done` carries the token a
 * bootstrap sign-in left, when it leaves one.
 */
export type GithubSignInState =
  | { step: 'ready'; error: string | null }
  | { step: 'starting' | 'finishing'; error: null }
  | { step: 'open'; session: SignInSessionState; error: null }
  | { step: 'done'; tokenId?: string; error: null }

/** The backend's side of one GitHub sign-in. */
export type GithubSignInActions = {
  /** Open the sign-in, or answer the one already open. */
  start: () => Promise<SignInSessionState>
  /** What a finished sign-in left, read once it finished; without it, finishing leaves nothing to read. */
  finish?: (sessionId: string) => Promise<string>
  /** The person's open sign-in sessions, read when the socket comes back. */
  listOpen: () => Promise<SignInSessionState[]>
}
