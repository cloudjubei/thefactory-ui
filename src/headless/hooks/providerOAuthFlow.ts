import { extractErrorMessage } from '../api/errorMessage'
import {
  isProviderOAuthPage,
  providerOAuthFailure,
  providerOAuthReturnOf,
  providerOAuthStateOf,
} from '../utils/providerConnectionForm'
import { PROVIDER_OAUTH_COPY } from '../utils/providerConnectionFormConstants'
import type {
  ProviderOAuthActions,
  ProviderOAuthStartBody,
  ProviderOAuthState,
} from '../utils/providerConnectionFormTypes'

const READY: ProviderOAuthState = { step: 'ready', error: null }

/**
 * One browser sign-in for a provider connection. The backend finishes a sign-in
 * from a POST of its code and state, and the page a browser ends on differs by
 * host, so the person pastes that page's address. The backend spends the state on
 * the first try: anything that reaches it and fails starts over, and what can be
 * refused here first is, so a slip of the paste costs nothing.
 */
export class ProviderOAuthFlow<C = unknown> {
  private _state: ProviderOAuthState
  private _provider: string | undefined
  private _run = 0
  private readonly _actions: ProviderOAuthActions<C>
  private readonly _listeners = new Set<() => void>()

  constructor(actions: ProviderOAuthActions<C>, initial: ProviderOAuthState = READY) {
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
      const page = await this._actions.start(provider, body)
      if (run !== this._run) return undefined
      if (!isProviderOAuthPage(page)) {
        this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.badPage })
        return undefined
      }
      this._provider = provider
      this._set({ step: 'waiting', page, error: null })
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

  /** Takes the address the browser ended on; answers the connection once it is kept. */
  finish = async (address: string): Promise<C | undefined> => {
    const waiting = this._state
    const provider = this._provider
    if (waiting.step !== 'waiting' || !provider) return undefined
    const result = providerOAuthReturnOf(address)
    if (result.kind === 'unreadable') {
      this._set({ ...waiting, error: PROVIDER_OAUTH_COPY.unreadable })
      return undefined
    }
    if (result.kind === 'refused') {
      this._set({ step: 'ready', error: PROVIDER_OAUTH_COPY.refused(result.reason) })
      return undefined
    }
    if (result.state !== providerOAuthStateOf(waiting.page)) {
      this._set({ ...waiting, error: PROVIDER_OAUTH_COPY.otherSignIn })
      return undefined
    }
    const run = ++this._run
    this._set({ step: 'finishing', error: null })
    try {
      const connection = await this._actions.finish(provider, {
        code: result.code,
        state: result.state,
      })
      if (run !== this._run) return undefined
      this._set({ step: 'done', error: null })
      return connection
    } catch (err) {
      if (run !== this._run) return undefined
      this._set({
        step: 'ready',
        error: providerOAuthFailure(extractErrorMessage(err, PROVIDER_OAUTH_COPY.finishFailed)),
      })
      return undefined
    }
  }

  reset = (): void => {
    this._run += 1
    this._provider = undefined
    this._set(READY)
  }

  private _set(next: ProviderOAuthState): void {
    this._state = next
    for (const listener of this._listeners) listener()
  }
}
