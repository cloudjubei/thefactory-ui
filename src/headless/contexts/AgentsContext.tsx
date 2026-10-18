import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  abortCompletion,
  abortCliAgentRun,
  deleteChat,
  rateChat,
  type GetChatResponse,
} from '../api/generated'
import { useChats } from './createChatsContext'

/**
 * A chat whose context is an agent-run (`AGENT_RUN_STORY` or
 * `AGENT_RUN_FEATURE`). The discriminator is enforced by `isAgentRunChat`
 * at the boundary; the rest of the codebase trusts the type narrowing.
 */
export type RunChat = GetChatResponse

export type AgentsContextValue = {
  /** All AGENT_RUN_* chats for the active project. */
  runs: RunChat[]
  /** Subset that are currently running (state === 'created' | 'running'). */
  runsActive: RunChat[]
  /** Subset that have finished. */
  runsHistory: RunChat[]

  /**
   * Cancel an in-flight run by aborting its completion. The backend
   * resolves the in-flight call with `resultType: 'aborted'` and the run
   * chat's state moves to `cancelled`. No-op (silent) when nothing is in
   * flight server-side, since the user's intent is "stop now."
   */
  cancelRun: (run: RunChat) => Promise<void>
  /** Delete a run chat and its messages. */
  deleteRun: (run: RunChat) => Promise<void>
  /**
   * Rate a finished run. `score` is a small integer (e.g. `1` for thumbs up,
   * `-1` for thumbs down — backend doesn't constrain the value). Pass an
   * empty `comment` to clear an existing one.
   */
  rateRun: (run: RunChat, score: number, comment?: string) => Promise<void>
}

const AgentsContext = createContext<AgentsContextValue | null>(null)

const isAgentRunChat = (c: GetChatResponse): c is RunChat =>
  c.context.type === 'AGENT_RUN_STORY' || c.context.type === 'AGENT_RUN_FEATURE'

export function AgentsProvider({ children }: { children: ReactNode }) {
  const { chats, refresh: refreshChats, getChatLiveState } = useChats()
  const runs = useMemo<RunChat[]>(() => chats.filter(isAgentRunChat), [chats])

  const runsActive = useMemo<RunChat[]>(
    () => runs.filter((r) => r.state === 'created' || r.state === 'running'),
    [runs],
  )

  const runsHistory = useMemo<RunChat[]>(() => runs, [runs])

  const cancelRun = useCallback<AgentsContextValue['cancelRun']>(
    async (run) => {
      // A CLI-backed run lives in a sandbox; abort it directly (SIGKILLs the
      // container mid-turn). The API abort below is a no-op for it but harmless.
      const runId = getChatLiveState(run.context).cliRunId
      if (runId) {
        try {
          await abortCliAgentRun({
            path: { runId },
            body: { reason: 'aborted by user' },
            throwOnError: true,
          })
        } catch {
          // Run already finished / not found — harmless.
        }
      }
      // An orchestrator (API) agent run is registered server-side by its stable
      // `agentRunId` (the random internal runId is never sent to the client).
      // Abort by that id — `chat-abort` (keyed by chat context) never reaches
      // the orchestrator's job registry, which is why cancel did nothing.
      const agentRunId = 'agentRunId' in run.context ? run.context.agentRunId : undefined
      if (agentRunId) {
        try {
          await abortCompletion({ body: { runId: agentRunId }, throwOnError: true })
        } catch {
          // 404 → nothing in flight; safe to ignore. The chat list refresh
          // below will reflect the latest state regardless.
        }
      }
      await refreshChats()
    },
    [refreshChats, getChatLiveState],
  )

  const deleteRun = useCallback<AgentsContextValue['deleteRun']>(
    async (run) => {
      await deleteChat({ body: { context: run.context }, throwOnError: true })
      await refreshChats()
    },
    [refreshChats],
  )

  const rateRun = useCallback<AgentsContextValue['rateRun']>(
    async (run, score, comment) => {
      await rateChat({
        body: { context: run.context, score, ...(comment ? { comment } : {}) },
        throwOnError: true,
      })
      await refreshChats()
    },
    [refreshChats],
  )

  const value = useMemo<AgentsContextValue>(
    () => ({
      runs,
      runsActive,
      runsHistory,
      cancelRun,
      deleteRun,
      rateRun,
    }),
    [runs, runsActive, runsHistory, cancelRun, deleteRun, rateRun],
  )

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>
}

export function useAgents(): AgentsContextValue {
  const ctx = useContext(AgentsContext)
  if (!ctx) throw new Error('useAgents must be used within AgentsProvider')
  return ctx
}
