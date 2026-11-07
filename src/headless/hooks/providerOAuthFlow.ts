import { extractErrorMessage } from '../api/errorMessage'
import { isProviderOAuthPage, providerOAuthFailure } from '../utils/providerConnectionForm'
import { PROVIDER_OAUTH_COPY } from '../utils/providerConnectionFormConstants'
import type {
  ProviderOAuthActions,
  ProviderOAuthStartBody,
  ProviderOAuthState,
  ProviderSignInReport,
} from '../utils/providerConnectionFormTypes'

const READY: ProviderOAuthState = { step: 'ready', error: null }

/**
 * One browser sign-in for a provider connection. The browser goes back to the
 * backend, not here, so the outcome reaches this flow as a report: pushed when the
 * sign-in ends, and read again when the socket comes back, since what goes out
 * while it is down is lost. Nothing here runs out: it waits until it is told, or
 * until the person backs out.
 */
export class ProviderOAuthFlow {
  private _state: ProviderOAuthState
  private _run = 0
  private readonly _actions: Pick<ProviderOAuthActions, 'start' | 'read' | 'withdraw'>
  private readonly _listeners = new Set<() => void>()

  constructor(
    actions: Pick<ProviderOAuthActions, 'start' | 'read' | 'withdraw'>,
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

  /** Answers the page to open in the browser, when there is one. */
  start = async (provider: string, body: ProviderOAuthStartBody): Promise<string | undefined> => {
    if (this._state.step !== 'ready') return undefined
    const run = ++this._run
    this._set({ step: 'opening', error: null })
    try {
      const { page, signInId } = await this._actions.start(provider, body)
      if (run !== this._run) return undefined
      if (!isProviderOAuthPage(page)) {
        this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.badPage })
        return undefined
      }
      this._set({ step: 'waiting', page, signInId, error: null })
      return page
    } catch (err) {
      if (run !== this._run) return undefined
      this._set({
        step: 'ready',
        error: providerOAuthFailure(extractErrorMessage(err, PROVIDER_OAUTH_COPY.startFailed)),
      })
      return undefined
    }
  }

  /** How a sign-in stands. One this flow is not waiting on is someone else's. */
  onReport = ({ signInId, status }: ProviderSignInReport): void => {
    const waiting = this._state
    if (waiting.step !== 'waiting' || waiting.signInId !== signInId) return
    if (status === 'waiting') return
    this._run += 1
    if (status === 'signed-in') this._set({ step: 'done', error: null })
    else if (status === 'declined')
      this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.declined })
    else this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.finishFailed })
  }

  /** Asks where this sign-in stands. A read that fails leaves it waiting: the socket says when to ask again. */
  check = async (): Promise<void> => {
    const waiting = this._state
    if (waiting.step !== 'waiting') return
    const run = this._run
    try {
      const report = await this._actions.read(waiting.signInId)
      if (run !== this._run) return
      if (report) this.onReport(report)
      else this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.lost })
    } catch {
      return
    }
  }

  /** Backs out, also of a sign-in whose browser was closed: it is withdrawn from the backend. */
  reset = (): void => {
    const waiting = this._state
    this._run += 1
    this._set(READY)
    if (waiting.step === 'waiting') {
      this._actions.withdraw(waiting.signInId).catch(() => undefined)
    }
  }

  private _set(next: ProviderOAuthState): void {
    this._state = next
    for (const listener of this._listeners) listener()
  }
}
