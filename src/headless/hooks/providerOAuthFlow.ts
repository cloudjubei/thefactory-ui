import type { SignInSessionState } from 'thefactory-tools/types'
import { extractErrorMessage } from '../api/errorMessage'
import { providerOAuthFailure } from '../utils/providerConnectionForm'
import { PROVIDER_OAUTH_COPY } from '../utils/providerConnectionFormConstants'
import type {
  ProviderOAuthActions,
  ProviderOAuthStartBody,
  ProviderOAuthState,
  ProviderSignInReport,
} from '../utils/providerConnectionFormTypes'
import { signInEndedNotice } from '../utils/signInSession'

const READY: ProviderOAuthState = { step: 'ready', error: null }

/**
 * One sign-in for a provider connection, made inside the app: a press shows at
 * once, asks the backend once however often it is pressed, and shows the
 * session the backend opened; a press while it is open shows it again. The
 * provider's page goes back to the backend, not here, so how it ended reaches
 * this flow as a report, as the session's own ending, and as a read when the
 * socket comes back, since what goes out while it is down is lost. A report
 * of a decline or a failure comes before the session closes, and its words stay.
 */
export class ProviderOAuthFlow {
  private _state: ProviderOAuthState
  private readonly _actions: Pick<ProviderOAuthActions, 'start' | 'read' | 'show'>
  /** Endings heard while a start is on its way: its session may be among them. */
  private _heard: SignInSessionState[] = []
  private readonly _listeners = new Set<() => void>()

  constructor(
    actions: Pick<ProviderOAuthActions, 'start' | 'read' | 'show'>,
    initial: ProviderOAuthState = READY,
  ) {
    this._actions = actions
    this._state = initial
  }

  getState = (): ProviderOAuthState => this._state

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  /** Open the sign-in inside the app, or show the one open again. */
  start = async (provider: string, body: ProviderOAuthStartBody): Promise<void> => {
    const now = this._state
    if (now.step === 'starting') return
    if (now.step === 'open') {
      this._actions.show(now.session)
      return
    }
    this._heard = []
    this._set({ step: 'starting', error: null })
    try {
      const { signInId, session } = await this._actions.start(provider, body)
      const endedFirst = this._heard.find((heard) => heard.id === session.id)
      this._heard = []
      this._set({ step: 'open', signInId, session, error: null })
      if (endedFirst) this.onEnded(endedFirst)
      else this._actions.show(session)
    } catch (err) {
      this._heard = []
      this._set({
        step: 'ready',
        error: providerOAuthFailure(extractErrorMessage(err, PROVIDER_OAUTH_COPY.startFailed)),
      })
    }
  }

  /** How a sign-in stands. One this flow is not waiting on is someone else's. */
  onReport = ({ signInId, status }: ProviderSignInReport): void => {
    const now = this._state
    if (now.step !== 'open' || now.signInId !== signInId) return
    if (status === 'waiting') return
    if (status === 'signed-in') this._set({ step: 'done', error: null })
    else if (status === 'declined')
      this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.declined })
    else this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.finishFailed })
  }

  /** A sign-in session ended. One this flow is not waiting on is someone else's. */
  onEnded = (session: SignInSessionState): void => {
    const now = this._state
    if (now.step === 'starting') {
      this._heard.push(session)
      return
    }
    if (now.step !== 'open' || now.session.id !== session.id) return
    if (session.status === 'finished') this._set({ step: 'done', error: null })
    else this._set({ step: 'ready', error: signInEndedNotice(session) ?? null })
  }

  /** Asks where this sign-in stands. A read that fails leaves it open: the socket says when to ask again. */
  check = async (): Promise<void> => {
    const now = this._state
    if (now.step !== 'open') return
    try {
      const report = await this._actions.read(now.signInId)
      if (this._state !== now) return
      if (report) this.onReport(report)
      else this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.lost })
    } catch {
      return
    }
  }

  private _set(next: ProviderOAuthState): void {
    this._state = next
    for (const listener of [...this._listeners]) listener()
  }
}
