import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ProviderOAuthActions, ProviderOAuthState } from '../utils/providerConnectionFormTypes'
import { ProviderOAuthFlow } from './providerOAuthFlow'

export type UseProviderOAuthFlow<C> = ProviderOAuthState & {
  start: ProviderOAuthFlow<C>['start']
  finish: ProviderOAuthFlow<C>['finish']
  reset: ProviderOAuthFlow<C>['reset']
}

/** A sign-in for the connection form. It lives as long as the form does. */
export function useProviderOAuthFlow<C>(
  actions: ProviderOAuthActions<C> | undefined,
  initial?: ProviderOAuthState,
): UseProviderOAuthFlow<C> {
  const latest = useRef(actions)
  useEffect(() => {
    latest.current = actions
  })
  const flow = useMemo(
    () =>
      new ProviderOAuthFlow<C>(
        {
          start: (provider, body) => {
            if (!latest.current) throw new Error('Sign-in is not available here.')
            return latest.current.start(provider, body)
          },
          finish: (provider, body) => {
            if (!latest.current) throw new Error('Sign-in is not available here.')
            return latest.current.finish(provider, body)
          },
        },
        initial,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const state = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState)
  return { ...state, start: flow.start, finish: flow.finish, reset: flow.reset }
}
