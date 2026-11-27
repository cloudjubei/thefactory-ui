import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { SignInSessionState } from 'thefactory-tools/types'
import { useApi, useOptionalApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { SIGN_IN_SESSION_ROUTES } from '../api/signInSessionsApi'
import { RemoteBrowserStore } from '../utils/remoteBrowserStore'
import type { RemoteBrowserSocket, RemoteBrowserState } from '../utils/remoteBrowserTypes'
import { signInBrowserApi, signInSessionView } from '../utils/signInSession'
import { SIGN_IN_BROWSER_CONTEXT, SIGN_IN_STREAM_SCOPE } from '../utils/signInSessionConstants'
import type { SignInSessionView, SignInSessionsApi } from '../utils/signInSessionTypes'
import { SignInSessionsStore } from './signInSessionsStore'

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, SignInSessionsStore>()

/** The app's one sign-in sessions store on a socket: whoever starts a sign-in and whoever shows it share it. */
export function signInSessionsStoreFor(ws: WsLike): SignInSessionsStore {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new SignInSessionsStore(ws)
  stores.set(ws, store)
  return store
}

export type UseSignInSession = {
  /** The sign-in the app shows now; `undefined` while none is. */
  view: SignInSessionView | undefined
  /** The shown session, for the page's live view. */
  session: SignInSessionState | undefined
  /** Show a session a sign-in just started, or one already open. */
  show: (session: SignInSessionState) => void
  /** Close the shown sign-in by hand: hidden at once, its session ended. */
  close: () => void
  /** Give the shown sign-in the value its prompt asks for. */
  answer: (text: string) => void
}

/**
 * The sign-in the app shows inside itself, whatever it signs in to: what
 * starts a sign-in calls `show` with its session, what hosts the view draws
 * `view`, and the view goes by itself once the session ends.
 */
export function useSignInSession(): UseSignInSession {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = signInSessionsStoreFor(ws)

  useEffect(() => {
    if (!token) return
    return store.retain()
  }, [store, token])

  const snapshot = useSyncExternalStore(store.listen, store.snapshot, store.snapshot)
  const view = useMemo(() => signInSessionView(snapshot), [snapshot])
  const close = useCallback(() => {
    void store.close()
  }, [store])
  const answer = useCallback(
    (text: string) => {
      void store.answer(text)
    },
    [store],
  )
  return useMemo(
    () => ({ view, session: snapshot.shown, show: store.show, close, answer }),
    [view, snapshot.shown, store, close, answer],
  )
}

export type UseSignInBrowserOptions = {
  /** Defaults to the backend's routes. */
  api?: SignInSessionsApi
  /** Defaults to the app's socket. */
  socket?: RemoteBrowserSocket
  /** Defaults to whether the app's socket is open. */
  connected?: boolean
}

export type UseSignInBrowser = {
  state: RemoteBrowserState
  store: RemoteBrowserStore
}

/**
 * A sign-in session's page, live: the remote browser's own store on the
 * session's page, started with the view and stopped with it, so its frames
 * come only while it shows.
 */
export function useSignInBrowser(
  session: SignInSessionState,
  options: UseSignInBrowserOptions = {},
): UseSignInBrowser {
  const app = useOptionalApi()
  const api = options.api ?? SIGN_IN_SESSION_ROUTES
  const socket = options.socket ?? app?.ws ?? SILENT_SOCKET
  const store = useMemo(
    () =>
      new RemoteBrowserStore({
        projectId: SIGN_IN_STREAM_SCOPE,
        context: SIGN_IN_BROWSER_CONTEXT,
        api: signInBrowserApi(session, api),
        socket,
      }),
    [session.id, api, socket],
  )

  useEffect(() => {
    store.start()
    return () => store.stop()
  }, [store])

  const open = options.connected ?? (app ? app.wsState === 'open' : true)
  useEffect(() => {
    store.setConnected(open)
  }, [store, open])

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  return { state, store }
}

const SILENT_SOCKET: RemoteBrowserSocket = {
  on: () => () => {},
  onReconnect: () => () => {},
  send: () => false,
}
