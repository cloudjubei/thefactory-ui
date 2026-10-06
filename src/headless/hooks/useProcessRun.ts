import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ProcessIntegrationDecision,
  ProcessResumeChoice,
  ProcessRun,
  ProofKind,
} from 'thefactory-tools/types'
import {
  cancelProcessRun,
  delegateProcessRunAsk,
  deleteProcessRun,
  getProcessRun,
  listProcessRunBranches,
  openProcessRunChat,
  resolveProcessRunIntegrationConflict,
  resolveProcessRunNeedsYouItem,
  resumeProcessRun,
  retryProcessRunIntegration,
  sendProcessRunBackForChanges,
} from '../api'
import { extractErrorMessage, useApi, useAuth } from '../api'
import type { ChatContext } from '../api'
import { cachedProcessRun, processRunCache } from './processViewCache'

/** A review branch a run tree owns — shown in the delete confirm's list. */
export type ProcessRunBranch = { projectId: string; branch: string }

/** The chat an ask was handed to. */
export type ProcessRunDelegation = { chatContextId: string; topicId: string; turnStarted: boolean }

/** A run's own chat, as opening it returns it. */
export type ProcessRunChatOpened = { chatContextId: string; context: ChatContext }

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
  /** Why the last answer or stop was refused — shown on the run, cleared by the next one. */
  actionError: string | null
  run: ProcessRun | undefined
  refresh: () => Promise<void>
  /**
   * Answer the park this run is sitting on — an approval of a work branch says
   * how it lands (the way, who it is made as, its words), and a request for
   * changes the proof its fix must show. Resolves `false` when it was refused;
   * the server's reason is in `actionError`.
   */
  resume: (
    choice: ProcessResumeChoice,
    note?: string,
    integration?: ProcessIntegrationDecision,
    requestedProof?: readonly ProofKind[],
  ) => Promise<boolean>
  /**
   * Try again to bring in approved work that did not land, the same way or
   * another. Resolves `false` when it was refused; the reason is in `actionError`.
   */
  retryIntegration: (integration: ProcessIntegrationDecision) => Promise<boolean>
  /**
   * Send approved work that conflicts with its base branch to an agent to
   * resolve; the run comes back for the person to confirm how it lands.
   * Resolves `false` when it was refused; the reason is in `actionError`.
   */
  resolveIntegrationConflict: () => Promise<boolean>
  /**
   * Send a run that ended on a request for changes back for them: it is
   * reopened into the fix with that note and comes back to the same sign-off.
   */
  sendBack: () => Promise<void>
  /**
   * Hand what the waiting agent asked for to another agent — a chat opened with
   * the whole ask. The run keeps waiting. Resolves to the chat's topic, or
   * `undefined` when it was refused (the reason is in `actionError`).
   */
  delegate: () => Promise<ProcessRunDelegation | undefined>
  cancel: () => Promise<void>
  /**
   * Open the run's own chat, creating it the first time. Resolves to its
   * context, or `undefined` when it was refused (the reason is in `actionError`).
   */
  openChat: () => Promise<ProcessRunChatOpened | undefined>
  /**
   * Settle one of the final report's "Needs you" items — fine as it is unless
   * `kind` says it is left for later. Resolves `false` when it was refused.
   */
  resolveNeedsYou: (
    itemId: string,
    kind?: 'resolved' | 'deferred',
    summary?: string,
  ) => Promise<boolean>
  /** The review branches this run tree owns — for the delete confirm's list. */
  listBranches: () => Promise<ProcessRunBranch[]>
  /** Delete this run and everything it owns (chats, CLI runs, records, opt. branches). */
  deleteRun: (opts?: { deleteBranches?: boolean }) => Promise<DeleteProcessRunResult | undefined>
}

/** A decision as the resume and integrate routes take it: the way, and who and what it lands as. */
function integrationBody({ mode, ...landing }: ProcessIntegrationDecision) {
  return { integration: mode, ...(Object.keys(landing).length > 0 ? { landing } : {}) }
}

/** The run this instance holds, for the id it was read for. */
type HeldRun = { runId: string | undefined; run: ProcessRun | undefined; settled: boolean }

function cachedHeldRun(runId: string | undefined): HeldRun {
  const run = cachedProcessRun(runId)
  return { runId, run, settled: runId === undefined || run !== undefined }
}

/**
 * One process run, kept live.
 *
 * The server pushes the WHOLE record on every step change, so the pipeline
 * moves without re-fetching — a pipeline that re-fetched per step would flicker
 * through a loading state on every node, which is most of what the user is
 * watching.
 *
 * Opening a run it has read before — or one a Processes list holds — paints
 * that record at once from `processViewCache`, and re-reads it behind.
 */
export function useProcessRun(runId: string | undefined): UseProcessRun {
  const { token } = useAuth()
  const { ws } = useApi()
  const [held, setHeld] = useState<HeldRun>(() => cachedHeldRun(runId))
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const current = held.runId === runId ? held : cachedHeldRun(runId)
  const run = current.run
  const isLoaded = current.settled

  const setRun = useCallback(
    (next: ProcessRun) => setHeld({ runId, run: next, settled: true }),
    [runId],
  )

  useEffect(() => {
    if (held.runId && held.run) processRunCache.set(held.runId, held.run)
  }, [held])

  useEffect(() => setActionError(null), [runId])

  const refresh = useCallback(async () => {
    if (!runId) {
      setHeld({ runId, run: undefined, settled: true })
      return
    }
    try {
      const { data } = await getProcessRun({ path: { runId }, throwOnError: true })
      setRun(data as ProcessRun)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
      setHeld((prev) =>
        prev.runId === runId
          ? { ...prev, settled: true }
          : { ...cachedHeldRun(runId), settled: true },
      )
    }
  }, [runId, setRun])

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
  }, [ws, runId, setRun])

  const resume = useCallback(
    async (
      choice: ProcessResumeChoice,
      note?: string,
      integration?: ProcessIntegrationDecision,
      requestedProof?: readonly ProofKind[],
    ) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await resumeProcessRun({
          path: { runId },
          body: {
            choice,
            ...(note ? { note } : {}),
            ...(integration ? integrationBody(integration) : {}),
            ...(requestedProof && requestedProof.length > 0
              ? { requestedProof: [...requestedProof] }
              : {}),
          },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The run could not be answered.'))
        return false
      }
    },
    [runId, setRun],
  )

  const retryIntegration = useCallback(
    async (integration: ProcessIntegrationDecision) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await retryProcessRunIntegration({
          path: { runId },
          body: integrationBody(integration),
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The work could not be brought in.'))
        return false
      }
    },
    [runId, setRun],
  )

  const resolveIntegrationConflict = useCallback(async () => {
    if (!runId) return false
    setActionError(null)
    try {
      const { data } = await resolveProcessRunIntegrationConflict({
        path: { runId },
        throwOnError: true,
      })
      setRun(data as ProcessRun)
      return true
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The conflict could not be sent to an agent.'))
      return false
    }
  }, [runId, setRun])

  const sendBack = useCallback(async () => {
    if (!runId) return
    setActionError(null)
    try {
      const { data } = await sendProcessRunBackForChanges({ path: { runId }, throwOnError: true })
      setRun(data as ProcessRun)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The run could not be sent back.'))
    }
  }, [runId, setRun])

  const delegate = useCallback(async (): Promise<ProcessRunDelegation | undefined> => {
    if (!runId) return undefined
    setActionError(null)
    try {
      const { data } = await delegateProcessRunAsk({ path: { runId }, throwOnError: true })
      const result = data as { run: ProcessRun } & ProcessRunDelegation
      setRun(result.run)
      return {
        chatContextId: result.chatContextId,
        topicId: result.topicId,
        turnStarted: result.turnStarted,
      }
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The ask could not be handed on.'))
      return undefined
    }
  }, [runId, setRun])

  const cancel = useCallback(async () => {
    if (!runId) return
    setActionError(null)
    try {
      const { data } = await cancelProcessRun({ path: { runId }, throwOnError: true })
      setRun(data as ProcessRun)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The run could not be stopped.'))
    }
  }, [runId, setRun])

  const openChat = useCallback(async (): Promise<ProcessRunChatOpened | undefined> => {
    if (!runId) return undefined
    setActionError(null)
    try {
      const { data } = await openProcessRunChat({ path: { runId }, throwOnError: true })
      return data as ProcessRunChatOpened
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The run’s chat could not be opened.'))
      return undefined
    }
  }, [runId])

  const resolveNeedsYou = useCallback(
    async (itemId: string, kind?: 'resolved' | 'deferred', summary?: string) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await resolveProcessRunNeedsYouItem({
          path: { runId },
          body: { itemId, ...(kind ? { kind } : {}), ...(summary ? { summary } : {}) },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'Your decision could not be recorded.'))
        return false
      }
    },
    [runId, setRun],
  )

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
      processRunCache.delete(runId)
      return data as DeleteProcessRunResult | undefined
    },
    [runId],
  )

  return useMemo<UseProcessRun>(
    () => ({
      isLoaded,
      loadError,
      actionError,
      run,
      refresh,
      resume,
      retryIntegration,
      resolveIntegrationConflict,
      sendBack,
      delegate,
      cancel,
      openChat,
      resolveNeedsYou,
      listBranches,
      deleteRun,
    }),
    [
      isLoaded,
      loadError,
      actionError,
      run,
      refresh,
      resume,
      retryIntegration,
      resolveIntegrationConflict,
      sendBack,
      delegate,
      cancel,
      openChat,
      resolveNeedsYou,
      listBranches,
      deleteRun,
    ],
  )
}
