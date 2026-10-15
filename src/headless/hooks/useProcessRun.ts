import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ProcessIntegrationDecision,
  ProcessResumeChoice,
  ProcessRun,
  ProcessTurnLimit,
  ProcessWaitingItemChoice,
  ProofKind,
} from 'thefactory-tools/types'
import {
  answerProcessRunWaitingRequest,
  cancelProcessRun,
  delegateProcessRunAsk,
  deleteProcessRun,
  getProcessRun,
  listProcessRunBranches,
  askAgentAboutProcessRunPark,
  resolveProcessRunIntegrationConflict,
  resolveProcessRunNeedsYouItem,
  resumeProcessRun,
  retryProcessRunIntegration,
  reviveProcessRun,
  sendProcessRunBackForChanges,
  setProcessRunManager,
  setProcessRunModel,
  setProcessRunTurnLimit,
  startProcessRunChanges,
  withdrawProcessRunChange,
} from '../api'
import { extractErrorMessage, useApi, useAuth } from '../api'
import type { ChatContext } from '../api'
import { cachedProcessRun, processRunCache } from './processViewCache'
import type { ProcessRetryPick } from '../utils/processTurnLimitViewTypes'
import type { LaunchAgentPick } from '../utils/launchAgentPickTypes'
import { runModelChangeBody } from '../utils/runModelChange'

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
    retry?: ProcessRetryPick,
  ) => Promise<boolean>
  /**
   * Decide ONE of several requests the waiting agent left open; the run carries
   * on once the last is decided. Resolves `false` when it was refused; the
   * reason is in `actionError`.
   */
  answerWaitingRequest: (actionId: string, choice: ProcessWaitingItemChoice) => Promise<boolean>
  /**
   * Hold every step agent of the run to `limit` from its next step on.
   * Resolves `false` when it was refused; the reason is in `actionError`.
   */
  setTurnLimit: (limit: ProcessTurnLimit) => Promise<boolean>
  /**
   * Switch the run's agent manager on or off. Resolves `false` when it was
   * refused; the reason is in `actionError`.
   */
  setManager: (enabled: boolean) => Promise<boolean>
  /**
   * Run the run's step agents — its nested runs' too — on `pick` from their
   * next step: an agent at work finishes its step first. Resolves `false` when
   * it was refused; the reason is in `actionError`.
   */
  setModel: (pick: LaunchAgentPick) => Promise<boolean>
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
   * Take a stopped run back up where it was: the step it was on waits to be
   * tried again, or the sign-off it was at waits for a decision.
   */
  revive: () => Promise<void>
  /**
   * Hand what the waiting agent asked for to another agent — a chat opened with
   * the whole ask. The run keeps waiting. Resolves to the chat's topic, or
   * `undefined` when it was refused (the reason is in `actionError`).
   */
  delegate: () => Promise<ProcessRunDelegation | undefined>
  cancel: () => Promise<void>
  /**
   * Ask an agent about the step the run stopped at, in the run's own chat: its
   * turn starts with a message naming the step and what it said last. Resolves
   * to the chat, or `undefined` when it was refused (the reason is in `actionError`).
   */
  askAgent: () => Promise<ProcessRunChatOpened | undefined>
  /**
   * Settle one of the final report's "Needs you" items — fine as it is unless
   * `kind` says it is left for later. Resolves `false` when it was refused.
   */
  resolveNeedsYou: (
    itemId: string,
    kind?: 'resolved' | 'deferred',
    summary?: string,
  ) => Promise<boolean>
  /**
   * Start the changes waiting on the run — exactly those shown — in one pass.
   * Resolves `false` when it was refused; the reason is in `actionError`.
   */
  startChanges: (changeIds: readonly string[]) => Promise<boolean>
  /** Take one waiting change off the run; the story keeps its edit. */
  withdrawChange: (changeId: string) => Promise<boolean>
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

/** Reads of a run under way, by id: every card and chip showing one run shares a single request. */
const readsInFlight = new Map<string, Promise<ProcessRun>>()

function readProcessRunShared(runId: string): Promise<ProcessRun> {
  const inFlight = readsInFlight.get(runId)
  if (inFlight) return inFlight
  const read = getProcessRun({ path: { runId }, throwOnError: true })
    .then(({ data }) => data as ProcessRun)
    .finally(() => readsInFlight.delete(runId))
  readsInFlight.set(runId, read)
  return read
}

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
  const { ws, client } = useApi()
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
      setRun(await readProcessRunShared(runId))
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
    const offUpdate = ws.on('process:run-update', (data: unknown) => {
      const update = data as { runId?: string; run?: ProcessRun; deleted?: boolean }
      if (update?.runId !== runId) return
      if (update.run) {
        setRun(update.run)
        return
      }
      if (update.deleted) {
        processRunCache.delete(runId)
        setHeld({ runId, run: undefined, settled: true })
      }
    })
    const offReconnect = ws.onReconnect(() => void refresh())
    return () => {
      offUpdate()
      offReconnect()
    }
  }, [ws, runId, setRun, refresh])

  const resume = useCallback(
    async (
      choice: ProcessResumeChoice,
      note?: string,
      integration?: ProcessIntegrationDecision,
      requestedProof?: readonly ProofKind[],
      retry?: ProcessRetryPick,
    ) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await resumeProcessRun({
          path: { runId },
          body: {
            choice,
            decidedVia: client,
            ...(note ? { note } : {}),
            ...(integration ? integrationBody(integration) : {}),
            ...(requestedProof && requestedProof.length > 0
              ? { requestedProof: [...requestedProof] }
              : {}),
            ...(retry?.retryMode ? { retryMode: retry.retryMode } : {}),
            ...(retry?.turnLimit ? { turnLimit: retry.turnLimit } : {}),
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
    [runId, client, setRun],
  )

  const answerWaitingRequest = useCallback(
    async (actionId: string, choice: ProcessWaitingItemChoice) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await answerProcessRunWaitingRequest({
          path: { runId, actionId },
          body: { choice, decidedVia: client },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The request could not be answered.'))
        return false
      }
    },
    [runId, client, setRun],
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

  const revive = useCallback(async () => {
    if (!runId) return
    setActionError(null)
    try {
      const { data } = await reviveProcessRun({ path: { runId }, throwOnError: true })
      setRun(data as ProcessRun)
    } catch (err) {
      setActionError(extractErrorMessage(err, 'The run could not be resumed.'))
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

  const setTurnLimit = useCallback(
    async (limit: ProcessTurnLimit) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await setProcessRunTurnLimit({
          path: { runId },
          body: { turnLimit: limit },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The turn limit could not be changed.'))
        return false
      }
    },
    [runId, setRun],
  )

  const setManager = useCallback(
    async (enabled: boolean) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await setProcessRunManager({
          path: { runId },
          body: { enabled },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The run’s manager could not be switched.'))
        return false
      }
    },
    [runId, setRun],
  )

  const setModel = useCallback(
    async (pick: LaunchAgentPick) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await setProcessRunModel({
          path: { runId },
          body: { ...runModelChangeBody(pick), decidedVia: client },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The run’s model could not be changed.'))
        return false
      }
    },
    [runId, client, setRun],
  )

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

  const askAgent = useCallback(async (): Promise<ProcessRunChatOpened | undefined> => {
    if (!runId) return undefined
    setActionError(null)
    try {
      const { data } = await askAgentAboutProcessRunPark({ path: { runId }, throwOnError: true })
      return data as ProcessRunChatOpened
    } catch (err) {
      setActionError(extractErrorMessage(err, 'An agent could not be asked about this step.'))
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

  const startChanges = useCallback(
    async (changeIds: readonly string[]) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await startProcessRunChanges({
          path: { runId },
          body: { changeIds: [...changeIds], decidedVia: client },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The changes could not be started.'))
        return false
      }
    },
    [runId, client, setRun],
  )

  const withdrawChange = useCallback(
    async (changeId: string) => {
      if (!runId) return false
      setActionError(null)
      try {
        const { data } = await withdrawProcessRunChange({
          path: { runId, changeId },
          throwOnError: true,
        })
        setRun(data as ProcessRun)
        return true
      } catch (err) {
        setActionError(extractErrorMessage(err, 'The change could not be removed.'))
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
      answerWaitingRequest,
      setTurnLimit,
      setManager,
      setModel,
      retryIntegration,
      resolveIntegrationConflict,
      sendBack,
      revive,
      delegate,
      cancel,
      askAgent,
      resolveNeedsYou,
      startChanges,
      withdrawChange,
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
      answerWaitingRequest,
      setTurnLimit,
      setManager,
      setModel,
      retryIntegration,
      resolveIntegrationConflict,
      sendBack,
      revive,
      delegate,
      cancel,
      askAgent,
      resolveNeedsYou,
      startChanges,
      withdrawChange,
      listBranches,
      deleteRun,
    ],
  )
}
