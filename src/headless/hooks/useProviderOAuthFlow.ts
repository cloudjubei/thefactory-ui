import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { ProviderOAuthActions, ProviderOAuthState } from '../utils/providerConnectionFormTypes'
import { ProviderOAuthFlow } from './providerOAuthFlow'

const NO_SIGN_IN = 'Sign-in is not available here.'

export type UseProviderOAuthFlow = ProviderOAuthState & {
  start: ProviderOAuthFlow['start']
}

/** A sign-in for the connection form, shown inside the app. It lives as long as the form does. */
export function useProviderOAuthFlow(
  actions: ProviderOAuthActions | undefined,
  initial?: ProviderOAuthState,
): UseProviderOAuthFlow {
  const latest = useRef(actions)
  useEffect(() => {
    latest.current = actions
  })
  const flow = useMemo(
    () =>
      new ProviderOAuthFlow(
        {
          start: (provider, body) => {
            if (!latest.current) throw new Error(NO_SIGN_IN)
            return latest.current.start(provider, body)
          },
          read: (signInId) => {
            if (!latest.current) throw new Error(NO_SIGN_IN)
            return latest.current.read(signInId)
          },
          show: (session) => latest.current?.show(session),
        },
        initial,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  useEffect(() => {
    if (!actions) return undefined
    const offReport = actions.onReport(flow.onReport)
    const offEnded = actions.onEnded(flow.onEnded)
    const offReconnect = actions.onReconnect(() => void flow.check())
    return () => {
      offReport()
      offEnded()
      offReconnect()
    }
  }, [actions, flow])
  const state = useSyncExternalStore(flow.subscribe, flow.getState, flow.getState)
  return { ...state, start: flow.start }
}
