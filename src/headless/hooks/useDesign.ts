import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { designItemContentUrl, findDesignItem, findDesignScreen } from '../utils/design'
import {
  designActionsFor,
  designSnapshot,
  designStateOf,
  refreshDesign,
  refreshStorageUsage,
  subscribeDesign,
} from './designStore'
import type { DesignActions, DesignProjectState } from './designStoreTypes'
import { invalidateReferenceProject } from './useReferences'
import { useOnWsReopen } from './useOnWsReopen'

/** A project's Design as the Design tab drives it. */
export type UseDesign = DesignProjectState &
  DesignActions & {
    refresh: () => Promise<void>
    /** Where an item's file is served; pass a view token from `mintViewToken` for an `<img>` or `<iframe>`. */
    contentUrl: (itemId: string, viewToken?: string) => string
    findScreen: (screenId: string) => ReturnType<typeof findDesignScreen>
    findItem: (itemId: string) => ReturnType<typeof findDesignItem>
  }

const IDLE = (): Promise<never> => Promise.reject(new Error('No project selected.'))

/**
 * A project's Design — apps, screens, drafts (one approved) and built versions
 * — with its storage usage and every change a person can make. Kept current by
 * `design:updated` (whoever changed it: the person, an agent, a sign-off) and
 * re-read when the socket comes back. `projectId === undefined` idles.
 */
export function useDesign(projectId: string | undefined): UseDesign {
  const { ws, apiBaseUrl } = useApi()
  const { token } = useAuth()
  const snapshot = useSyncExternalStore(subscribeDesign, designSnapshot, designSnapshot)
  const state = designStateOf(snapshot, projectId)

  const refresh = useCallback(async () => {
    if (!projectId) return
    await Promise.all([refreshDesign(projectId), refreshStorageUsage(projectId)])
  }, [projectId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])
  useOnWsReopen(() => void refresh())
  useEffect(() => {
    if (!projectId) return
    const offDesign = ws.on('design:updated', (data: unknown) => {
      if ((data as { projectId?: unknown } | undefined)?.projectId !== projectId) return
      void refreshDesign(projectId)
      void refreshStorageUsage(projectId)
    })
    const offUsage = ws.on('storage:usage-warning', () => void refreshStorageUsage(projectId))
    return () => {
      offDesign()
      offUsage()
    }
  }, [ws, projectId])

  const actions = useMemo<DesignActions>(
    () =>
      projectId
        ? designActionsFor(projectId, () => invalidateReferenceProject(projectId))
        : {
            createApp: IDLE,
            updateApp: IDLE,
            deleteApp: IDLE,
            createScreen: IDLE,
            renameScreen: IDLE,
            deleteScreen: IDLE,
            uploadDraft: IDLE,
            addProjectFileDraft: IDLE,
            addLinkDraft: IDLE,
            renameItem: IDLE,
            approveItem: IDLE,
            deleteItem: IDLE,
            fetchContent: IDLE,
            mintViewToken: IDLE,
          },
    [projectId],
  )

  const contentUrl = useCallback(
    (itemId: string, viewToken?: string) =>
      designItemContentUrl(apiBaseUrl ?? '', projectId ?? '', itemId, viewToken),
    [apiBaseUrl, projectId],
  )
  const findScreen = useCallback(
    (screenId: string) => findDesignScreen(state.tree, screenId),
    [state.tree],
  )
  const findItem = useCallback((itemId: string) => findDesignItem(state.tree, itemId), [state.tree])

  return useMemo(
    () => ({ ...state, ...actions, refresh, contentUrl, findScreen, findItem }),
    [state, actions, refresh, contentUrl, findScreen, findItem],
  )
}
