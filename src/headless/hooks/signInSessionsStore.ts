import type { SignInSessionState } from 'thefactory-tools/types'
import { extractErrorMessage } from '../api/errorMessage'
import { SIGN_IN_SESSION_ROUTES } from '../api/signInSessionsApi'
import type { WsClient } from '../api/WsClient'
import { signInSessionChangeOf } from '../utils/signInSession'
import { SIGN_IN_SESSIONS_EVENT, SIGN_IN_SESSION_TEXT } from '../utils/signInSessionConstants'
import type { SignInSessionsApi, SignInSessionsSnapshot } from '../utils/signInSessionTypes'

/**
 * The sign-in the app shows inside itself, whatever it signs in to: whoever
 * starts a sign-in hands its session here and the app shows it; the view
 * closes by itself the moment the backend tells the session ended, and
 * whoever waits for that ending hears of it. Closing by hand hides the view
 * at once and ends the session. What the person types goes straight to the
 * backend and is kept nowhere here.
 */
export class SignInSessionsStore {
  private readonly _ws: Pick<WsClient, 'on' | 'onReconnect'>
  private readonly _api: SignInSessionsApi
  private _session: SignInSessionState | undefined = undefined
  private _answering = false
  private _error: string | undefined = undefined
  /** The sessions told as ended: none of them is shown again. */
  private readonly _ended = new Set<string>()
  private _holders = 0
  private _disconnect: (() => void) | undefined = undefined
  private readonly _listeners = new Set<() => void>()
  private readonly _endings = new Set<(session: SignInSessionState) => void>()
  private _shown: SignInSessionsSnapshot | undefined = undefined

  constructor(
    ws: Pick<WsClient, 'on' | 'onReconnect'>,
    api: SignInSessionsApi = SIGN_IN_SESSION_ROUTES,
  ) {
    this._ws = ws
    this._api = api
  }

  private _tell(): void {
    this._shown = undefined
    for (const listener of [...this._listeners]) listener()
  }

  /** Hold the sessions live; returns the release. */
  retain = (): (() => void) => {
    this._holders += 1
    if (this._holders === 1) {
      const offChange = this._ws.on(SIGN_IN_SESSIONS_EVENT, (data: unknown) => this._changed(data))
      const offReconnect = this._ws.onReconnect(() => void this._reread())
      this._disconnect = () => {
        offChange()
        offReconnect()
      }
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

  /** Hear of every session's ending, with how it ended; returns the release. */
  onEnded = (listener: (session: SignInSessionState) => void): (() => void) => {
    this._endings.add(listener)
    return () => {
      this._endings.delete(listener)
    }
  }

  /** What the app shows — the same object until something changes. */
  snapshot = (): SignInSessionsSnapshot => {
    this._shown ??= { shown: this._session, answering: this._answering, error: this._error }
    return this._shown
  }

  /** Show a session a sign-in just started, or one already open and asked for again. */
  show = (session: SignInSessionState): void => {
    if (session.status !== 'open' || this._ended.has(session.id)) return
    if (this._session?.id === session.id) return
    this._session = session
    this._answering = false
    this._error = undefined
    this._tell()
  }

  /** Close the shown session by hand: hidden at once, shown again with why only if it is still open. */
  close = async (): Promise<void> => {
    const session = this._session
    if (!session) return
    this._session = undefined
    this._answering = false
    this._error = undefined
    this._tell()
    try {
      await this._api.close(session.id)
    } catch (err) {
      const open = await this._api.list().catch(() => [])
      if (this._session || this._ended.has(session.id)) return
      if (!open.some((s) => s.id === session.id)) return
      this._session = session
      this._error = extractErrorMessage(err, SIGN_IN_SESSION_TEXT.closeFailed)
      this._tell()
    }
  }

  /** Give the shown session the value its prompt asks for: once, however often it is pressed. */
  answer = async (text: string): Promise<void> => {
    const session = this._session
    if (!session || this._answering || text === '') return
    this._answering = true
    this._error = undefined
    this._tell()
    let error: string | undefined
    try {
      await this._api.answer(session.id, text)
    } catch (err) {
      error = extractErrorMessage(err, SIGN_IN_SESSION_TEXT.answerFailed)
    }
    if (this._session?.id !== session.id) return
    this._answering = false
    this._error = error
    this._tell()
  }

  private _changed(data: unknown): void {
    const session = signInSessionChangeOf(data)
    if (!session) return
    if (session.status === 'open') {
      if (this._session?.id !== session.id) return
      this._session = session
      this._tell()
      return
    }
    this._ended.add(session.id)
    if (this._session?.id === session.id) {
      this._session = undefined
      this._answering = false
      this._error = undefined
      this._tell()
    }
    for (const ending of [...this._endings]) ending(session)
  }

  private async _reread(): Promise<void> {
    const session = this._session
    if (!session) return
    let open: SignInSessionState[]
    try {
      open = await this._api.list()
    } catch {
      return
    }
    if (this._session?.id !== session.id) return
    this._session = open.find((s) => s.id === session.id)
    if (!this._session) {
      this._answering = false
      this._error = undefined
    }
    this._tell()
  }
}
