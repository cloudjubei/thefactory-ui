import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { previewCliRunReviewToBase, resolveCliRunReviewToBase, useApi } from '../api'
import type { CliRunReviewOnBase } from '../api/generated'
import { extractErrorMessage } from '../api/errorMessage'
import { REVIEW_ON_BASE_ERROR } from '../utils/reviewOnBaseConstants'
import type { ReviewOnBaseInput } from '../utils/reviewOnBaseTypes'
import { createCoalescedRefresh, isRunStateUpdate } from '../utils/runUpdateRefresh'

/** The review whose standing against its base is read: its run and project. */
export type ReviewOnBaseTarget = { runId: string; projectId: string }

export type UseReviewOnBase = ReviewOnBaseInput & {
  /** Close the review as already on its base; `force` only after the person confirmed it. */
  close: (force: boolean) => Promise<void>
}

function namesProject(data: unknown, projectId: string): boolean {
  const named = (data as { projectId?: unknown } | undefined)?.projectId
  return typeof named !== 'string' || named === projectId
}

function namesRun(data: unknown, runId: string): boolean {
  const update = data as { runId?: unknown; event?: { runId?: unknown } } | undefined
  const named = update?.runId ?? update?.event?.runId
  return typeof named !== 'string' || named === runId
}

/**
 * Whether a run's open review is already on its base — read when the review
 * mounts and again whenever the run or the project's git changes, so a base
 * that took the change since shows at once — and a way to close it: the
 * server re-judges it, and resolves it only when the base holds it, a later
 * commit replaced it, or the person confirmed it. Reads nothing without a target.
 */
export function useReviewOnBase(target: ReviewOnBaseTarget | undefined): UseReviewOnBase {
  const { ws } = useApi()
  const runId = target?.runId
  const projectId = target?.projectId
  const [preview, setPreview] = useState<CliRunReviewOnBase | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const alive = useRef(true)

  const read = useCallback(async () => {
    if (!runId || !projectId) return
    try {
      const { data } = await previewCliRunReviewToBase({
        path: { runId },
        query: { projectId },
        throwOnError: true,
      })
      if (alive.current) setPreview(data)
    } catch {
      if (alive.current) setPreview(undefined)
    }
  }, [runId, projectId])

  const refresh = useMemo(() => createCoalescedRefresh(read), [read])

  useEffect(() => {
    alive.current = true
    setPreview(undefined)
    setError(undefined)
    if (!runId || !projectId) {
      return () => {
        alive.current = false
      }
    }
    void refresh()
    const offRun = ws.on('cli:run-update', (data: unknown) => {
      if (isRunStateUpdate(data) && namesRun(data, runId)) void refresh()
    })
    const offGit = ws.on('git:status-changed', (data: unknown) => {
      if (namesProject(data, projectId)) void refresh()
    })
    const offReconnect = ws.onReconnect(() => void refresh())
    return () => {
      alive.current = false
      offRun()
      offGit()
      offReconnect()
    }
  }, [ws, runId, projectId, refresh])

  const close = useCallback(
    async (force: boolean) => {
      if (!runId || !projectId) return
      setBusy(true)
      setError(undefined)
      try {
        const { data } = await resolveCliRunReviewToBase({
          path: { runId },
          body: { projectId, ...(force ? { force: true } : {}) },
          throwOnError: true,
        })
        if (alive.current && data.kind === 'left-open') setError(data.reason)
      } catch (err) {
        if (alive.current) setError(extractErrorMessage(err, REVIEW_ON_BASE_ERROR))
      } finally {
        if (alive.current) setBusy(false)
        void refresh()
      }
    },
    [runId, projectId, refresh],
  )

  return {
    preview,
    ...(busy ? { busy } : {}),
    ...(error ? { error } : {}),
    close,
  }
}
