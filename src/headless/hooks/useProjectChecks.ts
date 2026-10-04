import { useCallback, useEffect, useRef, useState } from 'react'

import { listProjectChecks, type ProjectChecksListing } from '../api'
import { useAuth } from '../api/AuthContext'
import type { EvidenceLoadState } from '../utils/verifyProofTypes'

export type UseProjectChecks = {
  /** What the scan found the project can check; undefined until it answers, or when it could not. */
  scan: ProjectChecksListing | undefined
  /** Where the scan stands — a sign-off waits for it, but never fails for want of it. */
  state: EvidenceLoadState
  error: Error | null
  /** Read the scan again; `rescan` asks the backend to look at the files afresh. */
  refresh: (rescan?: boolean) => Promise<void>
}

/**
 * The non-agentic checks a project has — build, lint, type check, format, unit
 * tests — as a read-only scan of its files found them, so a surface can say a
 * check is available before anything ran it, and how it last went.
 *
 * Standalone hook: the scan is per project and cheap to repeat (the backend
 * caches it). Pass `projectId === undefined` to idle. A refresh keeps the last
 * scan while it reads, so nothing drawn from it flickers back to loading.
 */
export function useProjectChecks(projectId: string | undefined): UseProjectChecks {
  const { token } = useAuth()
  const [scan, setScan] = useState<ProjectChecksListing | undefined>(undefined)
  const [loadedFor, setLoadedFor] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const projectRef = useRef(projectId)
  projectRef.current = projectId

  const refresh = useCallback(
    async (rescan?: boolean) => {
      if (!projectId) {
        setScan(undefined)
        setError(null)
        setLoadedFor(undefined)
        return
      }
      try {
        const { data } = await listProjectChecks({
          path: { projectId },
          ...(rescan ? { query: { rescan: true } } : {}),
          throwOnError: true,
        })
        if (projectRef.current !== projectId) return
        setScan(data)
        setError(null)
      } catch (err) {
        if (projectRef.current !== projectId) return
        setScan(undefined)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        if (projectRef.current === projectId) setLoadedFor(projectId)
      }
    },
    [projectId],
  )

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
  return { scan: loadedFor === projectId ? scan : undefined, state, error, refresh }
}
