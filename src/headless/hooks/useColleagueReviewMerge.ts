import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import type { ReviewMergeSnapshot, ReviewMergeStart } from '../utils/colleagueReviewMergeTypes'
import { ColleagueReviewMergeStore } from './colleagueReviewMergeStore'

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, ColleagueReviewMergeStore>()

/** The one store of review merges per socket: every card of a review shares it. */
export function colleagueReviewMergeStoreFor(ws: WsLike): ColleagueReviewMergeStore {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new ColleagueReviewMergeStore(ws)
  stores.set(ws, store)
  return store
}

const IDLE: ReviewMergeSnapshot = {
  job: undefined,
  readError: undefined,
  starting: undefined,
  refusal: undefined,
  actionError: undefined,
}

const noListen = () => () => undefined

export type UseColleagueReviewMerge = {
  merge: ReviewMergeSnapshot
  /** Approve the round's pull requests and merge them: starting at once, held with why when refused. */
  start: (body: ReviewMergeStart) => void
}

/**
 * A ticket review's approve-and-merge, live: read once for every card that
 * shows it, again as the review changes and on a reconnect. Either id
 * undefined idles.
 */
export function useColleagueReviewMerge(
  groupId: string | undefined,
  ticketKey: string | undefined,
): UseColleagueReviewMerge {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = colleagueReviewMergeStoreFor(ws)
  const key = useMemo(
    () => (groupId && ticketKey ? { groupId, ticketKey } : undefined),
    [groupId, ticketKey],
  )

  useEffect(() => {
    if (!token || !key) return
    return store.retain(key)
  }, [store, token, key])

  const merge = useSyncExternalStore(
    useCallback(
      (listener: () => void) => (key ? store.listen(key, listener) : noListen()),
      [store, key],
    ),
    () => (key ? store.snapshot(key) : IDLE),
    () => (key ? store.snapshot(key) : IDLE),
  )
  const start = useCallback(
    (body: ReviewMergeStart) => {
      if (key) void store.start(key, body)
    },
    [store, key],
  )
  return useMemo(() => ({ merge, start }), [merge, start])
}
