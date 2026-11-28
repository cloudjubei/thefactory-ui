import type { SignInSessionState } from 'thefactory-tools/types'
import { extractErrorMessage } from '../api/errorMessage'
import { CLI_SIGN_IN_TEXT } from '../utils/cliSignInConstants'
import type { CliSignInDeps, CliSignInSnapshot, CliSignInStart } from '../utils/cliSignInTypes'
import { signInEndedNotice } from '../utils/signInSession'
import type { SignInSessionsStore } from './signInSessionsStore'

/**
 * One CLI agent's sign-in as the view that starts it follows it: busy at once
 * on the press, asked for once while the press is on its way, rolled back
 * with why. The session the backend answers is handed to the app's sign-in
 * sessions to show; pressed again later, the backend answers the open
 * session and it shows again. Its ending is told by the sessions: signed in,
 * or why not.
 */
export class CliSignInStore {
  private _pending: CliSignInStart | undefined = undefined
  private _starting = false
  private _error: string | undefined = undefined
  private _sessionId: string | undefined = undefined
  /** Sessions that ended while a press was on its way, by id. */
  private readonly _endedEarly = new Map<string, SignInSessionState>()
  private _holders = 0
  private _disconnect: (() => void) | undefined = undefined
  private readonly _listeners = new Set<() => void>()
  private _shown: CliSignInSnapshot | undefined = undefined

  private readonly _deps: CliSignInDeps
  private readonly _signIn: Pick<SignInSessionsStore, 'show' | 'onEnded'>

  constructor(deps: CliSignInDeps, signIn: Pick<SignInSessionsStore, 'show' | 'onEnded'>) {
    this._deps = deps
    this._signIn = signIn
  }

  private _tell(): void {
    this._shown = undefined
    for (const listener of [...this._listeners]) listener()
  }

  /** Hear how its sessions end; returns the release. */
  retain = (): (() => void) => {
    this._holders += 1
    if (this._holders === 1) {
      this._disconnect = this._signIn.onEnded((session) => this._ended(session))
    }
    let released = false
    return () => {
      if (released) return
      released = true
      this._holders -= 1
      if (this._holders === 0) {
        this._disconnect?.()
        this._disconnect = undefined
      }
    }
  }

  listen = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  /** The sign-in as its view draws it — the same object until something changes. */
  snapshot = (): CliSignInSnapshot => {
    this._shown ??= { pending: this._pending, starting: this._starting, error: this._error }
    return this._shown
  }

  /** Start the sign-in, or show the open one again: busy at once, sent only while no press is on its way. */
  start = async (request: CliSignInStart): Promise<void> => {
    if (this._starting) return
    this._starting = true
    this._pending = request
    this._error = undefined
    this._endedEarly.clear()
    this._tell()
    try {
      const session = await this._deps.start(request)
      this._sessionId = session.id
      this._signIn.show(session)
      const early = this._endedEarly.get(session.id)
      if (early) this._settle(early)
    } catch (err) {
      this._pending = undefined
      this._sessionId = undefined
      this._error = extractErrorMessage(err, CLI_SIGN_IN_TEXT.startFailed)
    }
    this._starting = false
    this._endedEarly.clear()
    this._tell()
  }

  /** Close the open sign-in by hand, as leaving the view that started it does. */
  stop = async (): Promise<void> => {
    const id = this._sessionId
    if (!id) return
    this._sessionId = undefined
    this._pending = undefined
    this._tell()
    await this._deps.close(id).catch(() => undefined)
  }

  private _ended(session: SignInSessionState): void {
    if (this._starting) this._endedEarly.set(session.id, session)
    if (session.id !== this._sessionId) return
    this._settle(session)
    this._tell()
  }

  private _settle(session: SignInSessionState): void {
    this._sessionId = undefined
    this._pending = undefined
    this._error = signInEndedNotice(session)
    if (session.status === 'finished') this._deps.onFinished?.()
  }
}
