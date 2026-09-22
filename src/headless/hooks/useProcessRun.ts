import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcessResumeChoice, ProcessRun } from 'thefactory-tools/types'
import {
  cancelProcessRun,
  deleteProcessRun,
  getProcessRun,
  listProcessRunBranches,
  resumeProcessRun,
} from '../api'
import { useApi, useAuth } from '../api'

/** A review branch a run tree owns — shown in the delete confirm's list. */
export type ProcessRunBranch = { projectId: string; branch: string }

/** What a cascade delete removed. */
export type DeleteProcessRunResult = {
  deletedRuns: number
  deletedChats: number
  deletedCliRuns: number
  deletedBranches: string[]
}

export type UseProcessRun = {
  isLoaded: boolean
  loadError: Error | null
  run: ProcessRun | undefined
  refresh: () => Promise<void>
  /** Answer the park this run is sitting on. */
  resume: (choice: ProcessResumeChoice, note?: string) => Promise<void>
  cancel: () => Promise<void>
  /** The review branches this run tree owns — for the delete confirm's list. */
  listBranches: () => Promise<ProcessRunBranch[]>
  /** Delete this run and everything it owns (chats, CLI runs, records, opt. branches). */
  deleteRun: (opts?: { deleteBranches?: boolean }) => Promise<DeleteProcessRunResult | undefined>
}

/**
 * One process run, kept live.
 *
 * The server pushes the WHOLE record on every step change, so the pipeline
 * moves without re-fetching — a pipeline that re-fetched per step would flicker
 * through a loading state on every node, which is most of what the user is
 * watching.
 */
export function useProcessRun(runId: string | undefined): UseProcessRun {
  const { token } = useAuth()
  const { ws } = useApi()
  const [run, setRun] = useState<ProcessRun | undefined>(undefined)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!runId) {
      setRun(undefined)
      setIsLoaded(true)
      return
    }
    try {
      const { data } = await getProcessRun({ path: { runId }, throwOnError: true })
      setRun(data as ProcessRun)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [runId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!runId) return
    return ws.on('process:run-update', (data: unknown) => {
      const update = data as { runId?: string; run?: ProcessRun }
      if (update?.runId === runId && update.run) setRun(update.run)
    })
  }, [ws, runId])

  const resume = useCallback(
    async (choice: ProcessResumeChoice, note?: string) => {
      if (!runId) return
      const { data } = await resumeProcessRun({
        path: { runId },
        body: { choice, ...(note ? { note } : {}) },
        throwOnError: true,
      })
      setRun(data as ProcessRun)
    },
    [runId],
  )

  const cancel = useCallback(async () => {
    if (!runId) return
    const { data } = await cancelProcessRun({ path: { runId }, throwOnError: true })
    setRun(data as ProcessRun)
  }, [runId])

  const listBranches = useCallback(async (): Promise<ProcessRunBranch[]> => {
    if (!runId) return []
    const { data } = await listProcessRunBranches({ path: { runId }, throwOnError: true })
    return (data as ProcessRunBranch[] | undefined) ?? []
  }, [runId])

  const deleteRun = useCallback(
    async (opts?: { deleteBranches?: boolean }) => {
      if (!runId) return undefined
      const { data } = await deleteProcessRun({
        path: { runId },
        body: { ...(opts?.deleteBranches ? { deleteBranches: true } : {}) },
        throwOnError: true,
      })
      return data as DeleteProcessRunResult | undefined
    },
    [runId],
  )

  return useMemo<UseProcessRun>(
    () => ({ isLoaded, loadError, run, refresh, resume, cancel, listBranches, deleteRun }),
    [isLoaded, loadError, run, refresh, resume, cancel, listBranches, deleteRun],
  )
}
