import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { groupTicketStatuses, groupTicketsView } from '../utils/groupTickets'
import type {
  GroupTicketListName,
  GroupTicketsView,
  TicketPlanStarted,
} from '../utils/groupTicketTypes'
import { GroupTicketsStore } from './groupTicketsStore'

const GROUP_STORIES_EVENT = 'groupStories:updated'

export type UseGroupTickets = {
  /** What the Tickets tab shows. */
  view: GroupTicketsView
  /** What is typed in the search box. */
  query: string
  setQuery: (query: string) => void
  /** Open a ticket's chat to talk it over; answers it, or `undefined` with why in the view. */
  discuss: (ticketKey: string) => Promise<TicketPlanStarted | undefined>
  /** Open a ticket's planning chat; answers it, or `undefined` with why in the view. */
  plan: (ticketKey: string) => Promise<TicketPlanStarted | undefined>
  loadMore: (name: GroupTicketListName) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * A store of a group's tickets kept current: `read` runs once there is a token, as
 * its group stories change, since a story linked to a ticket gives that ticket its
 * work, and on a reconnect. `groupId === undefined` idles.
 */
function useLiveTicketsStore(
  groupId: string | undefined,
  read: (store: GroupTicketsStore) => Promise<void>,
) {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = useMemo(() => new GroupTicketsStore(groupId ?? ''), [groupId])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token && groupId) void read(store)
  }, [token, groupId, store, read])

  useEffect(() => {
    if (!token || !groupId) return
    const offUpdate = ws.on(GROUP_STORIES_EVENT, (data: unknown) => {
      if ((data as { groupId?: string })?.groupId === groupId) void read(store)
    })
    const offReconnect = ws.onReconnect(() => void read(store))
    return () => {
      offUpdate()
      offReconnect()
    }
  }, [ws, token, groupId, store, read])

  return { store, state }
}

const readAll = (store: GroupTicketsStore) => store.refresh()
const readMine = (store: GroupTicketsStore) => store.refreshMine()

/** The Tickets tab's tickets: the person's, the rest of the sprint, and a search. */
export function useGroupTickets(groupId: string): UseGroupTickets {
  const { store, state } = useLiveTicketsStore(groupId, readAll)
  const [query, setQuery] = useState('')

  useEffect(() => {
    store.typed(query)
    return store.stopTyping
  }, [query, store])

  return useMemo(
    () => ({
      view: groupTicketsView(state),
      query,
      setQuery,
      discuss: store.discuss,
      plan: store.plan,
      loadMore: store.loadMore,
      refresh: store.refresh,
    }),
    [state, store, query],
  )
}

/**
 * Each of the person's sprint tickets' status by key, for a group story's chip.
 * `groupId === undefined` idles, for a page whose story has no ticket.
 */
export function useGroupTicketStatuses(groupId: string | undefined): Record<string, string> {
  const { state } = useLiveTicketsStore(groupId, readMine)
  return useMemo(() => groupTicketStatuses(state.mine.list?.tickets), [state.mine.list])
}
