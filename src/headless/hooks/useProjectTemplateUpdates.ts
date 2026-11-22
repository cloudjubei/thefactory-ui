import { useCallback, useEffect, useRef, useState } from 'react'

import {
  checkProjectTemplateUpdates,
  type CheckProjectTemplateUpdatesResponse,
} from '../api/generated'
import { useAuth } from '../api/AuthContext'
import type { EvidenceLoadState } from '../utils/verifyProofTypes'
import { isTemplateUpdatesAvailable, templateUpdatesAvailableLabel } from '../utils/templateUpdates'

export type UseProjectTemplateUpdates = {
  /** Latest check; undefined until the first answer, when idle, or when the read failed. */
  check: CheckProjectTemplateUpdatesResponse | undefined
  /** Where the read stands — a surface can wait for it, but never fail for want of it. */
  state: EvidenceLoadState
  error: Error | null
  /** Read the check again. */
  refresh: () => Promise<void>
  /** True when the catalog tip has moved past the project's recorded provenance. */
  available: boolean
  /** {@link templateUpdatesAvailableLabel} — set only when {@link available} is true. */
  availableLabel: string | undefined
}

/**
 * Whether a forked project has template updates available — compares the
 * project's recorded `metadata.templateProvenance` with the catalog tip via
 * `GET /projects/:projectId/template-updates`.
 *
 * Standalone hook (not on `ProjectsContext`): the check is per project and
 * only useful on a forked project's surface. Pass `projectId === undefined`
 * to idle.
 */
export function useProjectTemplateUpdates(
  projectId: string | undefined,
): UseProjectTemplateUpdates {
  const { token } = useAuth()
  const [check, setCheck] = useState<CheckProjectTemplateUpdatesResponse | undefined>(undefined)
  const [loadedFor, setLoadedFor] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const projectRef = useRef(projectId)
  projectRef.current = projectId

  const refresh = useCallback(async () => {
    if (!projectId) {
      setCheck(undefined)
      setError(null)
      setLoadedFor(undefined)
      return
    }
    try {
      const { data } = await checkProjectTemplateUpdates({
        path: { projectId },
        throwOnError: true,
      })
      if (projectRef.current !== projectId) return
      setCheck(data)
      setError(null)
    } catch (err) {
      if (projectRef.current !== projectId) return
      setCheck(undefined)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (projectRef.current === projectId) setLoadedFor(projectId)
    }
  }, [projectId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  const state: EvidenceLoadState = !projectId
    ? 'loaded'
    : loadedFor !== projectId
      ? 'loading'
      : error
        ? 'failed'
        : 'loaded'

  const current = loadedFor === projectId ? check : undefined
  return {
    check: current,
    state,
    error,
    refresh,
    available: isTemplateUpdatesAvailable(current),
    availableLabel: templateUpdatesAvailableLabel(current),
  }
}
