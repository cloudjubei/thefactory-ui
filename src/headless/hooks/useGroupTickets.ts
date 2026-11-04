import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { groupTicketStatuses, takeNextTicketView } from '../utils/groupTickets'
import type { TakeNextTicketView, TicketPlanStarted } from '../utils/groupTicketTypes'
import { GroupTicketsStore } from './groupTicketsStore'

const GROUP_STORIES_EVENT = 'groupStories:updated'

export type UseGroupTickets = {
  /** What Take next ticket shows; undefined for a group with no Jira, or until it is read. */
  view: TakeNextTicketView | undefined
  /** Each sprint ticket's status by key, for a group story's chip. */
  statuses: Record<string, string>
  /** Open a ticket's planning chat; answers it, or `undefined` with why in the view. */
  plan: (ticketKey: string) => Promise<TicketPlanStarted | undefined>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

/**
 * A group's sprint tickets, read again as its group stories change, since a
 * story linked to a ticket gives that ticket its work. `groupId === undefined`
 * idles, for a page whose story has no ticket.
 */
export function useGroupTickets(groupId: string | undefined): UseGroupTickets {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = useMemo(() => new GroupTicketsStore(groupId ?? ''), [groupId])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token && groupId) void store.refresh()
  }, [token, groupId, store])

  useEffect(() => {
    if (!token || !groupId) return
    const offUpdate = ws.on(GROUP_STORIES_EVENT, (data: unknown) => {
      if ((data as { groupId?: string })?.groupId === groupId) void store.refresh()
    })
    const offReconnect = ws.onReconnect(() => void store.refresh())
    return () => {
      offUpdate()
      offReconnect()
    }
  }, [ws, token, groupId, store])

  return useMemo(
    () => ({
      view: takeNextTicketView(state),
      statuses: groupTicketStatuses(state.list?.tickets),
      plan: store.plan,
      loadMore: store.loadMore,
      refresh: store.refresh,
    }),
    [state, store],
  )
}
