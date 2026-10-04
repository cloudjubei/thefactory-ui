import { useEffect, useSyncExternalStore } from 'react'
import { countPendingCliAgentActionsByChat } from '../api/generated'
import { useApi } from '../api'
import { isCliActionUpdateEvent } from '../utils/pendingToolGrants'

type WsLike = ReturnType<typeof useApi>['ws']

type PendingAsksStore = {
  counts: ReadonlyMap<string, number>
  listeners: Set<() => void>
  users: number
  stop?: () => void
}

const EMPTY: ReadonlyMap<string, number> = new Map()

/** One store per socket: every chat row reads the same counts from one fetch. */
const stores = new WeakMap<WsLike, PendingAsksStore>()

function storeFor(ws: WsLike): PendingAsksStore {
  let store = stores.get(ws)
  if (!store) {
    store = { counts: EMPTY, listeners: new Set(), users: 0 }
    stores.set(ws, store)
  }
  return store
}

function start(ws: WsLike, store: PendingAsksStore): () => void {
  let disposed = false
  let seq = 0
  const load = async () => {
    // A slower, older response must not overwrite a newer one.
    const mine = ++seq
    try {
      const { data } = await countPendingCliAgentActionsByChat({ throwOnError: true })
      if (disposed || mine !== seq) return
      store.counts = new Map(Object.entries(data.counts))
      for (const listener of store.listeners) listener()
    } catch {
      // Advisory: a failed refresh keeps the last counts rather than clearing them.
    }
  }
  void load()
  const off = ws.on('cli:run-update', (data) => {
    if (isCliActionUpdateEvent(data)) void load()
  })
  return () => {
    disposed = true
    off()
  }
}

/**
 * How many asks each chat has waiting on the user, by chat key — kept live: a
 * fresh count whenever an ask is raised or decided anywhere. A chat with one
 * reads as needing the user just as an unread reply does. Every caller shares
 * one fetch and one subscription.
 */
export function usePendingAsksByChat(): ReadonlyMap<string, number> {
  const { ws } = useApi()
  const store = storeFor(ws)
  useEffect(() => {
    store.users += 1
    if (store.users === 1) store.stop = start(ws, store)
    return () => {
      store.users -= 1
      if (store.users === 0) {
        store.stop?.()
        store.stop = undefined
      }
    }
  }, [ws, store])
  return useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener)
      return () => store.listeners.delete(listener)
    },
    () => store.counts,
    () => EMPTY,
  )
}
