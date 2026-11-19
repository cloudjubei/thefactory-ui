import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '../api/AuthContext'
import { groupTicketTabsEditorView } from '../utils/groupTicketTabsEditor'
import type { GroupTicketTabsChange, GroupTicketTabsEditorView } from '../utils/groupTicketTabTypes'
import { GroupTicketTabsEditorStore } from './groupTicketTabsEditorStore'
import { groupTicketsStoreFor } from './useGroupTickets'

export type UseGroupTicketTabsSettings = {
  view: GroupTicketTabsEditorView
  /** One change: shown at once, saved, undone with why when refused. */
  change: (change: GroupTicketTabsChange) => void
  /** Back to the default tabs. */
  reset: () => void
  /** Read the tabs again. */
  retry: () => void
}

/**
 * The group's ticket tabs in Settings → Group. Each saved change reaches the
 * group's Tickets tab at once, without a reload.
 */
export function useGroupTicketTabsSettings(groupId: string): UseGroupTicketTabsSettings {
  const { token } = useAuth()
  const store = useMemo(
    () =>
      new GroupTicketTabsEditorStore(groupId, (saved) =>
        groupTicketsStoreFor(groupId).tabsChanged(saved),
      ),
    [groupId],
  )
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token) void store.read()
  }, [token, store])

  return useMemo(
    () => ({
      view: groupTicketTabsEditorView(state),
      change: store.change,
      reset: store.reset,
      retry: () => void store.read(),
    }),
    [state, store],
  )
}
