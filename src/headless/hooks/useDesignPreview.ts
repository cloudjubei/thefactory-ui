import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { designContentUrl } from '../utils/design'
import type { DesignShown } from '../utils/designTypes'
import { designSnapshot, designStateOf, ensureDesign, subscribeDesign } from './designStore'
import type { DesignProjectState } from './designStoreTypes'
import { useDesignViewToken } from './useDesignViewToken'

/** A project's design as a preview shows it, with where each file is served. */
export type UseDesignPreview = Pick<DesignProjectState, 'index' | 'isLoaded'> & {
  /** A shown file's address with the view token; `undefined` until the token is minted. */
  contentUrl: (shown: DesignShown) => string | undefined
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
  const { index, isLoaded } = designStateOf(snapshot, projectId)
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
    (shown: DesignShown) =>
      token && projectId
        ? designContentUrl(apiBaseUrl ?? '', projectId, shown.ref, {
            viewToken: token,
            ...(shown.caseQuery ? { caseQuery: shown.caseQuery } : {}),
          })
        : undefined,
    [apiBaseUrl, projectId, token],
  )
  return { index, isLoaded, contentUrl }
}
