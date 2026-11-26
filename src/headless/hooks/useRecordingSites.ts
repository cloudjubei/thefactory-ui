import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { recordingSitesView } from '../utils/recordingSites'
import type { RecordingSitesView } from '../utils/recordingSitesTypes'
import { RecordingSitesStore } from './recordingSitesStore'

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, RecordingSitesStore>()

function storeFor(ws: WsLike): RecordingSitesStore {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new RecordingSitesStore(ws)
  stores.set(ws, store)
  return store
}

export type UseRecordingSites = {
  view: RecordingSitesView
  /** Open a site's sign-in window on the backend's machine: shown at once, rolled back with why. */
  signIn: (siteId: string) => void
}

/** The person's sign-ins to the sites recordings are fetched from, as Settings shows and starts them. */
export function useRecordingSites(): UseRecordingSites {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = storeFor(ws)

  useEffect(() => {
    if (!token) return
    return store.retain()
  }, [store, token])

  const snapshot = useSyncExternalStore(store.listen, store.snapshot, store.snapshot)
  const view = useMemo(() => recordingSitesView(snapshot, Date.now()), [snapshot])
  const signIn = useCallback(
    (siteId: string) => {
      void store.signIn(siteId)
    },
    [store],
  )
  return useMemo(() => ({ view, signIn }), [view, signIn])
}
