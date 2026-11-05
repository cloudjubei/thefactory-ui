import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { getProjectsGroupStatus, useApi, useAuth } from '../api'
import { BoundedCache } from '../utils/boundedCache'
import {
  GROUP_STATUS_CACHE_CAPACITY,
  GROUP_STATUS_LINGER_MS,
} from '../utils/groupStatusViewConstants'
import type { ProjectsGroupStatus } from '../utils/groupStatusViewTypes'
import { LiveResourceStore } from '../utils/liveResourceStore'

const STATUS_SIGNAL = 'projects-group:status-updated'

interface StatusSocket {
  on(event: string, handler: (data: unknown) => void): () => void
  onReconnect(handler: () => void): () => void
}

/** Whether a `projects-group:status-updated` signal is about this group. Pure. */
export function isProjectsGroupStatusSignal(data: unknown, groupId: string): boolean {
  return (
    typeof data === 'object' && data !== null && (data as { groupId?: unknown }).groupId === groupId
  )
}

const statusCache = new BoundedCache<ProjectsGroupStatus>(GROUP_STATUS_CACHE_CAPACITY)

/**
 * One read per group, however many views show it. The signal carries no data:
 * the backend has already folded a burst of member changes into it, so each one
 * is a read of the whole roll-up.
 */
export function createProjectsGroupStatusStore(
  ws: StatusSocket,
  load: (groupId: string) => Promise<ProjectsGroupStatus>,
  lingerMs: number = GROUP_STATUS_LINGER_MS,
): LiveResourceStore<ProjectsGroupStatus> {
  return new LiveResourceStore<ProjectsGroupStatus>({
    load,
    connect: (groupId, live) => {
      const offSignal = ws.on(STATUS_SIGNAL, (data: unknown) => {
        if (isProjectsGroupStatusSignal(data, groupId)) void live.refresh()
      })
      const offReconnect = ws.onReconnect(() => void live.refresh())
      return () => {
        offSignal()
        offReconnect()
      }
    },
    lingerMs,
    recall: (groupId) => statusCache.get(groupId),
    remember: (groupId, status) => statusCache.set(groupId, status),
  })
}

const stores = new WeakMap<StatusSocket, LiveResourceStore<ProjectsGroupStatus>>()

async function readStatus(groupId: string): Promise<ProjectsGroupStatus> {
  const { data } = await getProjectsGroupStatus({ path: { id: groupId }, throwOnError: true })
  return data
}

function statusStoreFor(ws: StatusSocket): LiveResourceStore<ProjectsGroupStatus> {
  const existing = stores.get(ws)
  if (existing) return existing
  const store = createProjectsGroupStatusStore(ws, readStatus)
  stores.set(ws, store)
  return store
}

export type UseProjectsGroupStatus = {
  isLoaded: boolean
  loadError: Error | null
  status: ProjectsGroupStatus | undefined
  refresh: () => Promise<void>
}

/** A group's roll-up, kept live: read again whenever the backend says it changed. */
export function useProjectsGroupStatus(groupId: string): UseProjectsGroupStatus {
  const { token } = useAuth()
  const { ws } = useApi()
  const store = statusStoreFor(ws)

  useEffect(() => {
    if (!token) return
    return store.retain(groupId)
  }, [store, groupId, token])

  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => store.listen(groupId, listener), [store, groupId]),
    () => store.snapshot(groupId),
    () => store.snapshot(groupId),
  )
  const refresh = useCallback(() => store.refresh(groupId), [store, groupId])

  return useMemo(
    () => ({
      isLoaded: snapshot.settled,
      loadError: snapshot.error,
      status: snapshot.data,
      refresh,
    }),
    [snapshot.settled, snapshot.error, snapshot.data, refresh],
  )
}
