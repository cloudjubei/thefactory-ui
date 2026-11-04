import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { ProcessGroupRun } from 'thefactory-tools/types'
import { listProcessGroupRuns, useApi, useAuth } from '../api'
import { LiveResourceStore } from '../utils/liveResourceStore'
import { groupSignOffCounts, isGroupRunAtSignOff } from '../utils/processGroupView'
import { PROCESS_RUN_LIST_LINGER_MS } from '../utils/processViewCacheConstants'
import type { ProcessGroupRunUpdate } from './useProcessGroupRun'

const KEY = 'waiting'

type WsLike = ReturnType<typeof useApi>['ws']

const stores = new WeakMap<WsLike, LiveResourceStore<ProcessGroupRun[]>>()

/**
 * The group runs at their sign-off after one `process:group-run-update`: one
 * that came to it put in or replaced, one that left it or was deleted dropped.
 * The same list back when nothing changes for it, so nothing draws again. Pure.
 */
export function applyGroupSignOffUpdate(
  prev: ProcessGroupRun[] | undefined,
  update: ProcessGroupRunUpdate,
): ProcessGroupRun[] | undefined {
  const id = update?.groupRunId
  if (!id) return prev
  const others = prev?.filter((r) => r.id !== id)
  if (update.run && isGroupRunAtSignOff(update.run)) return [...(others ?? []), update.run]
  if (!update.deleted && !update.run) return prev
  return others?.length === prev?.length ? prev : others
}

function groupSignOffStoreFor(ws: WsLike): LiveResourceStore<ProcessGroupRun[]> {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = new LiveResourceStore<ProcessGroupRun[]>({
    load: async () => {
      const { data } = await listProcessGroupRuns({
        query: { status: 'parked' },
        throwOnError: true,
      })
      return ((data as ProcessGroupRun[] | undefined) ?? []).filter(isGroupRunAtSignOff)
    },
    connect: (_key, live) => {
      const offUpdate = ws.on('process:group-run-update', (data: unknown) =>
        live.patch((prev) => applyGroupSignOffUpdate(prev, data as ProcessGroupRunUpdate)),
      )
      const offReconnect = ws.onReconnect(() => void live.refresh())
      return () => {
        offUpdate()
        offReconnect()
      }
    },
    lingerMs: PROCESS_RUN_LIST_LINGER_MS,
  })
  stores.set(ws, store)
  return store
}

/**
 * The group runs waiting at their one sign-off, by group — what the group's row
 * and Processes tab count. Every badge shares one read of the parked group runs
 * and one live subscription.
 */
export function useGroupSignOffCounts(): ReadonlyMap<string, number> {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = groupSignOffStoreFor(ws)

  useEffect(() => {
    if (!token) return
    return store.retain(KEY)
  }, [store, token])

  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => store.listen(KEY, listener), [store]),
    () => store.snapshot(KEY),
    () => store.snapshot(KEY),
  )
  return useMemo(() => groupSignOffCounts(snapshot.data ?? []), [snapshot.data])
}
