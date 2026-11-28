import type { SignInSessionState } from 'thefactory-tools/types'
import type { CliTool } from '../api/generated/types.gen'

/** A CLI agent's sign-in to start: a new login, or a stored one again. */
export interface CliSignInStart {
  cli: CliTool
  label: string
  /** The stored login signed in again, in place. */
  credentialId?: string
  /** The agent's sign-in card this sign-in answers. */
  captureId?: string
}

/** One CLI sign-in as the view that started it draws it. */
export interface CliSignInSnapshot {
  /** The sign-in pressed for, from the press until its session ends; `undefined` while none is. */
  pending: CliSignInStart | undefined
  /** The press is on its way to the backend. */
  starting: boolean
  /** Why the last sign-in did not start, or did not finish. */
  error: string | undefined
}

/** What a CLI sign-in is started and followed through. */
export interface CliSignInDeps {
  /** Start the sign-in, or find the one open: answers its session. */
  start: (request: CliSignInStart) => Promise<SignInSessionState>
  /** Close a session by hand. */
  close: (sessionId: string) => Promise<void>
  /** Told once the person is signed in. */
  onFinished?: () => void
}
