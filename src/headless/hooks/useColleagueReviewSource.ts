import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { waitingReviewOffers } from '../utils/colleagueReviewSource'
import type { ReviewSourceSnapshot, ReviewThreadWatch } from '../utils/colleagueReviewSourceTypes'
import { ColleagueReviewSourceStore } from './colleagueReviewSourceStore'

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, ColleagueReviewSourceStore>()

/** The one store of watched threads per socket: every view of a group's thread shares it. */
export function colleagueReviewSourceStoreFor(ws: WsLike): ColleagueReviewSourceStore {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new ColleagueReviewSourceStore(ws)
  stores.set(ws, store)
  return store
}

const IDLE: ReviewSourceSnapshot = {
  status: undefined,
  readError: undefined,
  pending: undefined,
  actionError: undefined,
}

const noListen = () => () => undefined

export type UseColleagueReviewSource = {
  /** The group's watched thread, the person's change on its way over it. */
  source: ReviewSourceSnapshot
  /** Watch a thread: shown at once, rolled back with why. */
  watch: (watch: ReviewThreadWatch) => void
  /** Stop watching the thread: gone at once, back with why. */
  clear: () => void
  refresh: () => Promise<void>
}

/**
 * A group's watched Slack thread, live: read once for every view that shows
 * it, again when it changes, a connection changes, or the socket is back.
 * `groupId === undefined` idles.
 */
export function useColleagueReviewSource(groupId: string | undefined): UseColleagueReviewSource {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = colleagueReviewSourceStoreFor(ws)

  useEffect(() => {
    if (!token || !groupId) return
    return store.retain(groupId)
  }, [store, token, groupId])

  const source = useSyncExternalStore(
    useCallback(
      (listener: () => void) => (groupId ? store.listen(groupId, listener) : noListen()),
      [store, groupId],
    ),
    () => (groupId ? store.snapshot(groupId) : IDLE),
    () => (groupId ? store.snapshot(groupId) : IDLE),
  )

  const watch = useCallback(
    (next: ReviewThreadWatch) => {
      if (groupId) void store.watch(groupId, next)
    },
    [store, groupId],
  )
  const clear = useCallback(() => {
    if (groupId) void store.clear(groupId)
  }, [store, groupId])
  const refresh = useCallback(
    () => (groupId ? store.refresh(groupId) : Promise.resolve()),
    [store, groupId],
  )

  return useMemo(() => ({ source, watch, clear, refresh }), [source, watch, clear, refresh])
}

/**
 * How many updates from the group's watched Slack thread wait for the person:
 * the number the Tickets tab's badge shows. It drops at once as they are
 * dismissed or started from.
 */
export function useReviewOfferCount(groupId: string | undefined): number {
  return waitingReviewOffers(useColleagueReviewSource(groupId).source.status)
}
