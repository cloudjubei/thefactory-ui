import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import type { DesignContentRef } from '../api'
import { designContentUrl, findDesignScreen, findDesignState } from '../utils/design'
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
    /** Where a version's or an entry's file is served; pass a view token from `mintViewToken` for an `<img>` or `<iframe>`. */
    contentUrl: (ref: DesignContentRef, opts?: { viewToken?: string; caseQuery?: string }) => string
    findScreen: (screenId: string) => ReturnType<typeof findDesignScreen>
    findState: (stateId: string) => ReturnType<typeof findDesignState>
  }

const IDLE = (): Promise<never> => Promise.reject(new Error('No project selected.'))

/**
 * A project's Design — apps, screens and components, states, versions,
 * proposals and tidy-up plans — with its storage usage and every change a
 * person can make. Kept current by
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
            updateScreen: IDLE,
            deleteScreen: IDLE,
            createState: IDLE,
            updateState: IDLE,
            deleteState: IDLE,
            propose: IDLE,
            proposeDraft: IDLE,
            fileEntry: IDLE,
            acceptProposal: IDLE,
            keepProposal: IDLE,
            chooseProposal: IDLE,
            sendBackProposal: IDLE,
            renameProposal: IDLE,
            deleteProposal: IDLE,
            restoreVersions: IDLE,
            savePlaygroundState: IDLE,
            decideTidyMove: IDLE,
            previewTidy: IDLE,
            applyTidy: IDLE,
            dismissTidy: IDLE,
            fetchContent: IDLE,
            mintViewToken: IDLE,
          },
    [projectId],
  )

  const contentUrl = useCallback(
    (ref: DesignContentRef, opts?: { viewToken?: string; caseQuery?: string }) =>
      designContentUrl(apiBaseUrl ?? '', projectId ?? '', ref, opts),
    [apiBaseUrl, projectId],
  )
  const findScreen = useCallback(
    (screenId: string) => findDesignScreen(state.index, screenId),
    [state.index],
  )
  const findState = useCallback(
    (stateId: string) => findDesignState(state.index, stateId),
    [state.index],
  )

  return useMemo(
    () => ({ ...state, ...actions, refresh, contentUrl, findScreen, findState }),
    [state, actions, refresh, contentUrl, findScreen, findState],
  )
}
