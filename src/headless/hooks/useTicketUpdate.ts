import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '../api/AuthContext'
import { ticketUpdateCard } from '../utils/ticketUpdate'
import type { ProcessDeliveryTarget } from '../utils/processDeliveryTypes'
import type { TicketUpdateCardView } from '../utils/ticketUpdateTypes'
import { TicketUpdateStore } from './ticketUpdateStore'

export type UseTicketUpdate = {
  /** The card; undefined until read, or while the update is not offered. */
  card: TicketUpdateCardView | undefined
  /** Post the update, once confirmed. Resolves `false` when refused. */
  post: () => Promise<boolean>
}

/**
 * A run's or a group run's ticket update, read again whenever `revision`
 * moves on. Pass no target to read nothing.
 */
export function useTicketUpdate(
  target: ProcessDeliveryTarget | undefined,
  revision?: string | number,
): UseTicketUpdate {
  const { token } = useAuth()
  const key = target
    ? `${target.kind}:${target.kind === 'run' ? target.runId : target.groupRunId}`
    : ''
  const store = useMemo(() => (target ? new TicketUpdateStore(target) : undefined), [key])
  const state = useSyncExternalStore(
    store?.subscribe ?? NO_SUBSCRIBE,
    store?.getState ?? NO_STATE,
    store?.getState ?? NO_STATE,
  )

  useEffect(() => {
    if (token && store) void store.refresh()
  }, [token, store, revision])

  return useMemo(
    () => ({ card: state ? ticketUpdateCard(state) : undefined, post: store?.post ?? NO_POST }),
    [state, store],
  )
}

const NO_SUBSCRIBE = () => () => undefined
const NO_STATE = () => undefined
const NO_POST = async () => false
