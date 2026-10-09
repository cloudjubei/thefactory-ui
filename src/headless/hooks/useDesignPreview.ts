import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { designItemContentUrl } from '../utils/design'
import { designSnapshot, designStateOf, ensureDesign, subscribeDesign } from './designStore'
import type { DesignProjectState } from './designStoreTypes'
import { useDesignViewToken } from './useDesignViewToken'

/** A project's design as a preview shows it, with where each item's file is served. */
export type UseDesignPreview = Pick<DesignProjectState, 'tree' | 'isLoaded'> & {
  /** An item's file with the view token; `undefined` until the token is minted. */
  contentUrl: (itemId: string) => string | undefined
}

/**
 * A project's design for a surface that only shows it — a reference chip's
 * miniature, the viewer it expands to. Shares the Design tab's copy, loading it
 * once when nothing has, and again on `design:updated`.
 */
export function useDesignPreview(projectId: string | undefined): UseDesignPreview {
  const { ws, apiBaseUrl } = useApi()
  const { token: bearer } = useAuth()
  const snapshot = useSyncExternalStore(subscribeDesign, designSnapshot, designSnapshot)
  const { tree, isLoaded } = designStateOf(snapshot, projectId)
  const { token } = useDesignViewToken(projectId)

  useEffect(() => {
    if (!projectId || !bearer) return
    void ensureDesign(projectId)
  }, [projectId, bearer])
  useEffect(() => {
    if (!projectId) return
    return ws.on('design:updated', (data: unknown) => {
      if ((data as { projectId?: unknown } | undefined)?.projectId !== projectId) return
      void ensureDesign(projectId, { changed: true })
    })
  }, [ws, projectId])

  const contentUrl = useCallback(
    (itemId: string) =>
      token && projectId
        ? designItemContentUrl(apiBaseUrl ?? '', projectId, itemId, token)
        : undefined,
    [apiBaseUrl, projectId, token],
  )
  return { tree, isLoaded, contentUrl }
}
