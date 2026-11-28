import type { SignInSessionState } from 'thefactory-tools/types'
import { errorStatus, extractErrorMessage } from '../api/errorMessage'
import type { WsClient } from '../api/WsClient'
import { GITHUB_SIGN_IN_TEXT } from '../utils/githubSignInConstants'
import type { GithubSignInActions, GithubSignInState } from '../utils/githubSignInTypes'
import { signInEndedNotice } from '../utils/signInSession'
import type { SignInSessionsStore } from './signInSessionsStore'

const READY: GithubSignInState = { step: 'ready', error: null }

const refusalWords = (err: unknown): string | undefined => {
  const words = (err as { response?: { data?: { error?: unknown } } } | null | undefined)?.response
    ?.data?.error
  return typeof words === 'string' && words.trim() !== '' ? words.trim() : undefined
}

function startFailure(err: unknown): string {
  const words = refusalWords(err)
  if (words) return words
  if (errorStatus(err) === 503) return GITHUB_SIGN_IN_TEXT.notSetUp
  return extractErrorMessage(err, GITHUB_SIGN_IN_TEXT.startFailed)
}

/**
 * One GitHub sign-in made inside the app: a press shows at once, asks the
 * backend once however often it is pressed, and hands the session the backend
 * opened to the app's sign-in sessions to show; a press while it is open shows
 * it again. Once the session ends it is done (reading what a finished one left,
 * when there is something to read), or back to ready, saying why when it ran
 * out or failed, and silently when the person closed it.
 */
export class GithubSignInStore {
  private _state: GithubSignInState = READY
  private readonly _actions: GithubSignInActions
  private readonly _signIn: Pick<SignInSessionsStore, 'show' | 'onEnded'>
  private readonly _ws: Pick<WsClient, 'onReconnect'>
  /** Endings heard while a start is on its way: its session may be among them. */
  private _heard: SignInSessionState[] = []
  private _holders = 0
  private _disconnect: (() => void) | undefined = undefined
  private readonly _listeners = new Set<() => void>()

  constructor(
    actions: GithubSignInActions,
    signIn: Pick<SignInSessionsStore, 'show' | 'onEnded'>,
    ws: Pick<WsClient, 'onReconnect'>,
  ) {
    this._actions = actions
    this._signIn = signIn
    this._ws = ws
  }

  getState = (): GithubSignInState => this._state

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  /** Hear the sign-in's ending and the socket coming back; returns the release. */
  retain = (): (() => void) => {
    this._holders += 1
    if (this._holders === 1) {
      const offEnded = this._signIn.onEnded((session) => this._ended(session))
      const offReconnect = this._ws.onReconnect(() => void this._reread())
      this._disconnect = () => {
        offEnded()
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

  /** Open the sign-in, or show the one open again. */
  start = async (): Promise<void> => {
    const now = this._state
    if (now.step === 'starting' || now.step === 'finishing') return
    if (now.step === 'open') {
      this._signIn.show(now.session)
      return
    }
    this._heard = []
    this._set({ step: 'starting', error: null })
    let session: SignInSessionState
    try {
      session = await this._actions.start()
    } catch (err) {
      this._set({ step: 'ready', error: startFailure(err) })
      return
    }
    const endedFirst = this._heard.find((heard) => heard.id === session.id)
    this._heard = []
    if (endedFirst) {
      this._set({ step: 'open', session, error: null })
      this._ended(endedFirst)
      return
    }
    this._signIn.show(session)
    this._set({ step: 'open', session, error: null })
  }

  private _ended(session: SignInSessionState): void {
    const now = this._state
    if (now.step === 'starting') {
      this._heard.push(session)
      return
    }
    if (now.step !== 'open' || now.session.id !== session.id) return
    if (session.status !== 'finished') {
      this._set({ step: 'ready', error: signInEndedNotice(session) ?? null })
      return
    }
    void this._finish(session.id, GITHUB_SIGN_IN_TEXT.finishFailed)
  }

  private async _finish(sessionId: string, unreadable: string): Promise<void> {
    const { finish } = this._actions
    if (!finish) {
      this._set({ step: 'done', error: null })
      return
    }
    this._set({ step: 'finishing', error: null })
    try {
      const tokenId = await finish(sessionId)
      this._set({ step: 'done', tokenId, error: null })
    } catch {
      this._set({ step: 'ready', error: unreadable })
    }
  }

  private async _reread(): Promise<void> {
    const now = this._state
    if (now.step !== 'open') return
    let open: SignInSessionState[]
    try {
      open = await this._actions.listOpen()
    } catch {
      return
    }
    if (this._state !== now) return
    if (open.some((session) => session.id === now.session.id)) return
    if (!this._actions.finish) {
      this._set(READY)
      return
    }
    await this._finish(now.session.id, GITHUB_SIGN_IN_TEXT.lost)
  }

  private _set(next: GithubSignInState): void {
    this._state = next
    for (const listener of [...this._listeners]) listener()
  }
}
