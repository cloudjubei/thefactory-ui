import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ColleagueReview } from 'thefactory-tools/types'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { extractErrorMessage } from '../api/errorMessage'
import { COLLEAGUE_REVIEW_CARD_TEXT } from '../utils/colleagueReviewCardConstants'
import type { ReviewPendingActions } from '../utils/colleagueReviewCardTypes'
import {
  ColleagueReviewStore,
  colleagueReviewKey,
  type ColleagueReviewSnapshot,
} from './colleagueReviewStore'

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, ColleagueReviewStore>()

function colleagueReviewStoreFor(ws: WsLike): ColleagueReviewStore {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new ColleagueReviewStore(ws)
  stores.set(ws, store)
  return store
}

const IDLE: ColleagueReviewSnapshot = {
  review: undefined,
  settled: false,
  readError: null,
  pending: { drops: new Set(), givens: new Set() },
  actionError: undefined,
}

const noListen = () => () => undefined

export type UseColleagueReview = {
  /** The review as it is now, with the person's own changes on their way; `null` when there is none. */
  review: ColleagueReview | null | undefined
  /** Why it could not be read, while nothing has been. */
  readError: string | undefined
  pending: ReviewPendingActions
  /** Why the person's last drop or given did not go through. */
  actionError: string | undefined
  /** Drop a finding, shown at once; rolled back with why when it fails. */
  dropFinding: (findingId: string, note?: string) => void
  /** Mark a waited-on item given, shown at once; rolled back with why when it fails. */
  markGiven: (waitingOnId: string, note?: string) => void
  refresh: () => Promise<void>
}

/**
 * A ticket's review, live: read once for every card that shows it, again on
 * `colleagueReviews:updated` for it and on a reconnect. Either id undefined idles.
 */
export function useColleagueReview(
  groupId: string | undefined,
  ticketKey: string | undefined,
): UseColleagueReview {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = colleagueReviewStoreFor(ws)
  const key = groupId && ticketKey ? colleagueReviewKey(groupId, ticketKey) : undefined

  useEffect(() => {
    if (!token || !key) return
    return store.retain(key)
  }, [store, token, key])

  const snapshot = useSyncExternalStore(
    useCallback(
      (listener: () => void) => (key ? store.listen(key, listener) : noListen()),
      [store, key],
    ),
    () => (key ? store.snapshot(key) : IDLE),
    () => (key ? store.snapshot(key) : IDLE),
  )

  const dropFinding = useCallback(
    (findingId: string, note?: string) => {
      if (key) void store.drop(key, findingId, note)
    },
    [store, key],
  )
  const markGiven = useCallback(
    (waitingOnId: string, note?: string) => {
      if (key) void store.markGiven(key, waitingOnId, note)
    },
    [store, key],
  )
  const refresh = useCallback(() => (key ? store.refresh(key) : Promise.resolve()), [store, key])

  return useMemo(
    () => ({
      review: snapshot.review,
      readError:
        snapshot.readError && snapshot.review === undefined
          ? extractErrorMessage(snapshot.readError, COLLEAGUE_REVIEW_CARD_TEXT.readFailed)
          : undefined,
      pending: snapshot.pending,
      actionError: snapshot.actionError,
      dropFinding,
      markGiven,
      refresh,
    }),
    [snapshot, dropFinding, markGiven, refresh],
  )
}
