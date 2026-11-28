import type { SignInSessionState } from 'thefactory-tools/types'
import type {
  RemoteBrowserActionResult,
  RemoteBrowserInput,
  RemoteBrowserSize,
} from './remoteBrowserTypes'

/** The routes every sign-in session is driven through, whatever it signs in to. */
export interface SignInSessionsApi {
  /** The person's open sessions. */
  list: () => Promise<SignInSessionState[]>
  close: (sessionId: string) => Promise<void>
  input: (sessionId: string, input: RemoteBrowserInput) => Promise<RemoteBrowserActionResult>
  resize: (sessionId: string, viewport: RemoteBrowserSize) => Promise<RemoteBrowserActionResult>
  /** Give a session the value its prompt asks for. */
  answer: (sessionId: string, text: string) => Promise<void>
}

/** The sign-in the app shows now, as views draw it. */
export interface SignInSessionsSnapshot {
  /** The session shown; `undefined` while none is. */
  shown: SignInSessionState | undefined
  /** An answer to its prompt is on its way. */
  answering: boolean
  /** Why the last answer was not taken, or the session did not close. */
  error: string | undefined
}

/** A value a prompt asks the person for. */
export interface SignInSessionInputView {
  label: string
  secret?: boolean
}

/** The shown sign-in as its view draws it: a live page, or a prompt. */
export interface SignInSessionView {
  id: string
  title: string
  /** What happens once the person is signed in. */
  hint: string
  surface: 'browser' | 'prompt'
  /** A prompt's line. */
  message?: string
  /** A prompt's address shows as a live page beside it, inside the app. */
  page?: true
  /** The address that page opened on, shown above it. */
  address?: string
  /** A code the person copies onto that page. */
  code?: string
  /** The value a prompt asks for. */
  input?: SignInSessionInputView
  /** A prompt's answer is on its way. */
  answering?: boolean
  error?: string
}
