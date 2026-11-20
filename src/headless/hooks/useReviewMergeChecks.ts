import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { reviewMergeChecksView } from '../utils/reviewMergeChecks'
import type { ReviewMergeChecksView } from '../utils/reviewMergeChecksTypes'
import { ReviewMergeChecksStore } from './reviewMergeChecksStore'

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, ReviewMergeChecksStore>()

function storeFor(ws: WsLike): ReviewMergeChecksStore {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new ReviewMergeChecksStore(ws)
  stores.set(ws, store)
  return store
}

export type UseReviewMergeChecks = {
  view: ReviewMergeChecksView
  /** Make a check required to merge or not: shown at once, rolled back with why. */
  setRequired: (repository: string, check: string, required: boolean) => void
}

/** The checks a group's approve-and-merge waits for, per repository, as Settings shows and changes them. */
export function useReviewMergeChecks(groupId: string): UseReviewMergeChecks {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = storeFor(ws)

  useEffect(() => {
    if (!token) return
    return store.retain(groupId)
  }, [store, token, groupId])

  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => store.listen(groupId, listener), [store, groupId]),
    () => store.snapshot(groupId),
    () => store.snapshot(groupId),
  )
  const view = useMemo(() => reviewMergeChecksView(snapshot), [snapshot])
  const setRequired = useCallback(
    (repository: string, check: string, required: boolean) => {
      void store.setRequired(groupId, { repository, check, required })
    },
    [store, groupId],
  )
  return useMemo(() => ({ view, setRequired }), [view, setRequired])
}
