import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { startCliSignIn } from '../api/cliSignInApi'
import { SIGN_IN_SESSION_ROUTES } from '../api/signInSessionsApi'
import { useCliConfigs } from '../contexts/CliConfigsContext'
import type { CliSignInSnapshot, CliSignInStart } from '../utils/cliSignInTypes'
import { CliSignInStore } from './cliSignInStore'
import { signInSessionsStoreFor } from './useSignInSession'

export type { CliSignInStart } from '../utils/cliSignInTypes'

export type UseCliSignIn = CliSignInSnapshot & {
  /** Sign in inside the app, or show the open sign-in again. */
  start: (request: CliSignInStart) => void
  /** Close the open sign-in, as leaving the view that started it does. */
  stop: () => Promise<void>
}

/**
 * One CLI agent's sign-in, made inside the app: the press shows busy at once
 * and the backend's session is shown by the app's sign-in view. Once signed
 * in the CLI logins are read again and `onSignedIn` runs; a sign-in that did
 * not finish leaves why in `error`.
 */
export function useCliSignIn(onSignedIn?: () => void): UseCliSignIn {
  const { ws } = useApi()
  const { refresh } = useCliConfigs()
  const signedIn = useRef(onSignedIn)
  signedIn.current = onSignedIn
  const sessions = signInSessionsStoreFor(ws)
  const store = useMemo(
    () =>
      new CliSignInStore(
        {
          start: startCliSignIn,
          close: SIGN_IN_SESSION_ROUTES.close,
          onFinished: () => {
            void refresh()
            signedIn.current?.()
          },
        },
        sessions,
      ),
    [sessions, refresh],
  )
  useEffect(() => sessions.retain(), [sessions])
  useEffect(() => store.retain(), [store])
  const snapshot = useSyncExternalStore(store.listen, store.snapshot, store.snapshot)
  const start = useCallback(
    (request: CliSignInStart) => {
      void store.start(request)
    },
    [store],
  )
  return useMemo(() => ({ ...snapshot, start, stop: store.stop }), [snapshot, start, store])
}
