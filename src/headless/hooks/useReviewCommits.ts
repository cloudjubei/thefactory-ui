import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { readColleagueReviewCommits } from '../api/colleagueReviewApi'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { reviewCommitsOfState, reviewCommitsView } from '../utils/reviewCommits'
import { COLLEAGUE_REVIEWS_EVENT } from '../utils/colleagueReviewStartConstants'
import type { ReviewCommitsView } from '../utils/reviewCommitsTypes'
import { ReviewCommitsStore } from './reviewCommitsStore'

const stores = new Map<string, ReviewCommitsStore>()

/** The one store of a group's commits since review: its Tickets tab, ticket pages and review chats share it. */
export function reviewCommitsStoreFor(groupId: string): ReviewCommitsStore {
  const held = stores.get(groupId)
  if (held) return held
  const store = new ReviewCommitsStore((ticketKey) =>
    readColleagueReviewCommits(groupId, ticketKey),
  )
  stores.set(groupId, store)
  return store
}

const NONE: Readonly<Record<string, ReviewCommitsView>> = {}

/** The views of the keys' commits as the store holds them at `_version`. */
function viewsAt(
  store: ReviewCommitsStore | undefined,
  keys: string,
  _version: number,
): Readonly<Record<string, ReviewCommitsView>> {
  if (!store || !keys) return NONE
  const views: Record<string, ReviewCommitsView> = {}
  for (const key of keys.split('\n')) {
    const view = reviewCommitsView(reviewCommitsOfState(store.getState(key)))
    if (view) views[key] = view
  }
  return views
}
const noListen = () => () => undefined
const noVersion = () => 0

/**
 * What each ticket's pull requests did since its review's last round, by key:
 * read in the background as the tickets show, again as a ticket's review
 * changes and on a reconnect. A ticket not read yet is left out, so nothing
 * waits on GitHub. `groupId === undefined` idles.
 */
export function useReviewCommits(
  groupId: string | undefined,
  ticketKeys: readonly string[],
): Readonly<Record<string, ReviewCommitsView>> {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = groupId ? reviewCommitsStoreFor(groupId) : undefined
  const keys = ticketKeys.join('\n')

  useEffect(() => {
    if (!token || !store || !keys) return
    for (const key of keys.split('\n')) store.request(key)
  }, [token, store, keys])

  useEffect(() => {
    if (!token || !store || !groupId) return
    const offReview = ws.on(COLLEAGUE_REVIEWS_EVENT, (data: unknown) => {
      const update = data as { groupId?: string; ticketKey?: string } | undefined
      if (update?.groupId !== groupId) return
      if (update.ticketKey) store.refresh(update.ticketKey)
      else store.refreshAll()
    })
    const offReconnect = ws.onReconnect(() => store.refreshAll())
    return () => {
      offReview()
      offReconnect()
    }
  }, [ws, token, store, groupId])

  const version = useSyncExternalStore(
    store?.subscribe ?? noListen,
    store?.getVersion ?? noVersion,
    store?.getVersion ?? noVersion,
  )

  return useMemo(() => viewsAt(store, keys, version), [store, keys, version])
}
