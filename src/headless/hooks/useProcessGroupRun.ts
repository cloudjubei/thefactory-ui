import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ProcessGroupLegLandingCheck,
  ProcessGroupLegLandingClaim,
  ProcessGroupRebuildPlan,
  ProcessGroupResumeInput,
  ProcessGroupRun,
} from 'thefactory-tools/types'
import {
  cancelProcessGroupRun,
  checkProcessGroupLegLanding,
  deleteProcessGroupRun,
  extractErrorMessage,
  getProcessGroupRun,
  listProcessGroupRunBranches,
  markProcessGroupLegLanded,
  planProcessGroupLegRebuild,
  reopenProcessGroupRun,
  resumeProcessGroupRun,
  useApi,
  useAuth,
} from '../api'
import type { DeleteProcessRunResult, ProcessRunBranch } from './useProcessRun'

/** A `process:group-run-update` event as it arrives on the socket. */
export type ProcessGroupRunUpdate = {
  groupRunId?: string
  groupId?: string
  run?: ProcessGroupRun
  /** Set when the group run was deleted. */
  deleted?: boolean
}

export type UseProcessGroupRun = {
  isLoaded: boolean
  loadError: Error | null
  /** Why the last answer or stop was refused — shown on the run, cleared by the next one. */
  actionError: string | null
  group: ProcessGroupRun | undefined
  /** Set once the group run was deleted while open. */
  deleted: boolean
  refresh: () => Promise<void>
  /** Answer the group run's park — its sign-off, an early merge, a leg that stopped. */
  resume: (input: ProcessGroupResumeInput) => Promise<boolean>
  cancel: () => Promise<void>
  /** Whether a leg's work is on its base branch outside its run — nothing recorded. */
  checkLanding: (
    legId: string,
    claim: ProcessGroupLegLandingClaim,
  ) => Promise<ProcessGroupLegLandingCheck | undefined>
  /** Record a leg's work as landed outside its run, once the server's check proves it. */
  markLanded: (legId: string, claim: ProcessGroupLegLandingClaim) => Promise<boolean>
  /** How a merged leg would be rebuilt before the legs that need it start, and why — read now, nothing done. */
  planRebuild: (legId: string) => Promise<ProcessGroupRebuildPlan | undefined>
  /** Resume an ended group run whose skipped legs can now start. */
  reopen: () => Promise<boolean>
  /** The review branches every leg's runs own — for the delete confirm's list. */
  listBranches: () => Promise<ProcessRunBranch[]>
  /** Delete an ended group run and everything its legs own. */
  deleteGroupRun: (opts?: {
    deleteBranches?: boolean
  }) => Promise<DeleteProcessRunResult | undefined>
}

/**
 * One group run, kept live. The server pushes the whole record — with its legs'
 * summed totals — on every write of the group run and of any of its legs' runs.
 */
export function useProcessGroupRun(groupRunId: string | undefined): UseProcessGroupRun {
  const { token } = useAuth()
  const { ws } = useApi()
  const [group, setGroup] = useState<ProcessGroupRun | undefined>(undefined)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    setActionError(null)
    setDeleted(false)
  }, [groupRunId])

  const refresh = useCallback(async () => {
    if (!groupRunId) {
      setGroup(undefined)
      setIsLoaded(true)
      return
    }
    try {
      const { data } = await getProcessGroupRun({ path: { groupRunId }, throwOnError: true })
      setGroup(data as ProcessGroupRun)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [groupRunId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!groupRunId) return
    return ws.on('process:group-run-update', (data: unknown) => {
      const update = data as ProcessGroupRunUpdate
      if (update?.groupRunId !== groupRunId) return
      if (update.deleted) {
        setDeleted(true)
        setGroup(undefined)
        return
      }
      if (update.run) setGroup(update.run)
    })
  }, [ws, groupRunId])

  const resume = useCallback(
    async (input: ProcessGroupResumeInput): Promise<boolean> => {
      if (!groupRunId) return false
      setActionError(null)
      try {
        const { data } = await resumeProcessGroupRun({
          path: { groupRunId },
          body: input,
          throwOnError: true,
        })
        setGroup(data as ProcessGroupRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The group run could not be answered.'))
        return false
      }
    },
    [groupRunId],
  )

  const cancel = useCallback(async () => {
    if (!groupRunId) return
    setActionError(null)
    try {
      const { data } = await cancelProcessGroupRun({ path: { groupRunId }, throwOnError: true })
      setGroup(data as ProcessGroupRun)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The group run could not be stopped.'))
    }
  }, [groupRunId])

  const checkLanding = useCallback(
    async (
      legId: string,
      claim: ProcessGroupLegLandingClaim,
    ): Promise<ProcessGroupLegLandingCheck | undefined> => {
      if (!groupRunId) return undefined
      setActionError(null)
      try {
        const { data } = await checkProcessGroupLegLanding({
          path: { groupRunId, legId },
          body: claim,
          throwOnError: true,
        })
        return data as ProcessGroupLegLandingCheck
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The leg’s landing could not be checked.'))
        return undefined
      }
    },
    [groupRunId],
  )

  const markLanded = useCallback(
    async (legId: string, claim: ProcessGroupLegLandingClaim): Promise<boolean> => {
      if (!groupRunId) return false
      setActionError(null)
      try {
        const { data } = await markProcessGroupLegLanded({
          path: { groupRunId, legId },
          body: claim,
          throwOnError: true,
        })
        setGroup(data as ProcessGroupRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The leg could not be marked as landed.'))
        return false
      }
    },
    [groupRunId],
  )

  const planRebuild = useCallback(
    async (legId: string): Promise<ProcessGroupRebuildPlan | undefined> => {
      if (!groupRunId) return undefined
      try {
        const { data } = await planProcessGroupLegRebuild({
          path: { groupRunId, legId },
          throwOnError: true,
        })
        return data as ProcessGroupRebuildPlan
      } catch {
        return undefined
      }
    },
    [groupRunId],
  )

  const reopen = useCallback(async (): Promise<boolean> => {
    if (!groupRunId) return false
    setActionError(null)
    try {
      const { data } = await reopenProcessGroupRun({ path: { groupRunId }, throwOnError: true })
      setGroup(data as ProcessGroupRun)
      return true
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The group run could not be resumed.'))
      return false
    }
  }, [groupRunId])

  const listBranches = useCallback(async (): Promise<ProcessRunBranch[]> => {
    if (!groupRunId) return []
    const { data } = await listProcessGroupRunBranches({
      path: { groupRunId },
      throwOnError: true,
    })
    return (data as ProcessRunBranch[] | undefined) ?? []
  }, [groupRunId])

  const deleteGroupRun = useCallback(
    async (opts?: { deleteBranches?: boolean }) => {
      if (!groupRunId) return undefined
      const { data } = await deleteProcessGroupRun({
        path: { groupRunId },
        body: { ...(opts?.deleteBranches ? { deleteBranches: true } : {}) },
        throwOnError: true,
      })
      return data as DeleteProcessRunResult | undefined
    },
    [groupRunId],
  )

  return useMemo<UseProcessGroupRun>(
    () => ({
      isLoaded,
      loadError,
      actionError,
      group,
      deleted,
      refresh,
      resume,
      cancel,
      checkLanding,
      markLanded,
      planRebuild,
      reopen,
      listBranches,
      deleteGroupRun,
    }),
    [
      isLoaded,
      loadError,
      actionError,
      group,
      deleted,
      refresh,
      resume,
      cancel,
      checkLanding,
      markLanded,
      planRebuild,
      reopen,
      listBranches,
      deleteGroupRun,
    ],
  )
}
