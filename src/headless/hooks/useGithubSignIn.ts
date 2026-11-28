import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useApi } from '../api'
import { githubSignInActions } from '../api/githubSignInApi'
import type { GithubSignInPurpose, GithubSignInState } from '../utils/githubSignInTypes'
import { GithubSignInStore } from './githubSignInStore'
import { signInSessionsStoreFor } from './useSignInSession'

export type UseGithubSignIn = {
  state: GithubSignInState
  /** A press is on its way, or a finished sign-in is being read. */
  busy: boolean
  /** Open the sign-in inside the app, or show the one open again. */
  start: () => void
}

/**
 * A GitHub sign-in made inside the app, for as long as the view that offers
 * it lives. A git credential sign-in is kept under `scopeLabel` as it reads
 * when pressed; a bootstrap one is `done` with the token it left.
 */
export function useGithubSignIn(
  purpose: GithubSignInPurpose,
  scopeLabel: string = '',
): UseGithubSignIn {
  const { ws } = useApi()
  const label = useRef(scopeLabel)
  label.current = scopeLabel
  const store = useMemo(
    () =>
      new GithubSignInStore(
        githubSignInActions(purpose, () => label.current),
        signInSessionsStoreFor(ws),
        ws,
      ),
    [purpose, ws],
  )
  useEffect(() => store.retain(), [store])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)
  return useMemo(
    () => ({
      state,
      busy: state.step === 'starting' || state.step === 'finishing',
      start: () => void store.start(),
    }),
    [state, store],
  )
}
