import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { TICKET_STATUSES_READ_DELAY_MS } from '../utils/ticketConnectionConstants'
import type { TicketStatusList } from '../utils/ticketConnectionTypes'
import { TicketStatusesReader } from './ticketStatusesReader'

/**
 * The statuses of a binding's connection. Typing project keys changes them on every
 * key, so a read waits for the typing to settle. No connection answers why.
 */
export function useTicketStatuses(
  list: (connectionId: string, projectKeys: readonly string[]) => Promise<readonly string[]>,
  connectionId: string | undefined,
  projectKeys: readonly string[] | undefined,
): TicketStatusList {
  const latest = useRef(list)
  useEffect(() => {
    latest.current = list
  })
  const reader = useMemo(() => new TicketStatusesReader((id, keys) => latest.current(id, keys)), [])
  const keys = (projectKeys ?? []).join(',')
  useEffect(() => {
    if (!connectionId) {
      reader.none()
      return undefined
    }
    reader.begin()
    const timer = setTimeout(
      () => void reader.read(connectionId, keys ? keys.split(',') : []),
      TICKET_STATUSES_READ_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [reader, connectionId, keys])
  return useSyncExternalStore(reader.subscribe, reader.getState, reader.getState)
}
