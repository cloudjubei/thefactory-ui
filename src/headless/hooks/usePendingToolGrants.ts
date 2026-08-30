import { useCallback, useEffect, useMemo, useState } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import {
  decideCliAgentAction,
  listCliAgentRuns,
  listPendingCliAgentActions,
  type ChatContext,
  type PendingAction,
} from '../api/generated'
import { useApi } from '../api'
import { useChats } from '../contexts/createChatsContext'
import type { PendingToolGrant, PendingToolGrantDecision } from '../utils/chatTypes'
import {
  apiToolCallToGrant,
  cliDecideOutcome,
  cliPendingActionToGrant,
  isCliActionUpdateEvent,
  isCliRunLifecycleEvent,
  isToolGrantAction,
  pickActiveCliRunId,
} from '../utils/pendingToolGrants'
import { answerDecision, declineDecision, isQuestionAction } from '../utils/agentQuestions'

/**
 * The run a chat is currently EXECUTING, which is what the run view mounts on.
 * Approvals are no longer read from it — a pending approval outlives the run
 * that raised it, so those are read per chat.
 */
const ACTIVE_CLI_RUN_STATUS = 'running' as const

export type UsePendingToolGrants = {
  /** Unified API + CLI grants awaiting a decision, in [api…, cli…] order. */
  grants: PendingToolGrant[]
  /**
   * The CLI run the grants were read from — the caller's `runId` when it had
   * one, otherwise the chat's active run as resolved from the backend. Callers
   * gate the approval surface on this rather than on their own live state, which
   * a reload or remount loses while the agent stays blocked.
   */
  cliRunId?: string
}

/**
 * Unifies the two tool-approval sources behind one {@link PendingToolGrant}[]:
 * API `require_confirmation` tool-calls (resolved as a batch via the chats
 * context's `confirmTools`) and a CLI run's gated `PendingAction`s (resolved
 * individually via `decideCliAgentAction`). API grants accumulate per-row
 * decisions and auto-commit once every row is decided; CLI grants dispatch
 * immediately and support the `'permanent'` decision (`approved-permanent`).
 *
 * `runId` is an optimisation, not a requirement: when the caller doesn't have
 * one the hook resolves the chat's active CLI run itself, so an approval the
 * agent is blocked on stays reachable across a reload.
 */
export function usePendingToolGrants(ctx: ChatContext, runId?: string): UsePendingToolGrants {
  const { getChatLiveState, confirmTools } = useChats()
  const { ws } = useApi()

  const chatContextId = getChatContextKey(ctx)
  const apiToolCalls = getChatLiveState(ctx).pendingToolConfirmation?.toolCalls ?? []
  const [apiDecisions, setApiDecisions] = useState<Record<string, boolean>>({})
  const [cliActions, setCliActions] = useState<PendingAction[]>([])
  const [discoveredRunId, setDiscoveredRunId] = useState<string>()

  // A caller only knows a runId while its own live state holds one, which a
  // reload or a remount drops — and a run blocked on an approval keeps blocking.
  // Ask the backend which run this chat has active instead, so the prompt is
  // reachable from a cold page. Re-resolved on run lifecycle events (not on a
  // timer) so a run that starts, ends, or raises a prompt is picked up live.
  useEffect(() => {
    if (runId) {
      setDiscoveredRunId(undefined)
      return
    }
    let cancelled = false
    const discover = async () => {
      try {
        const { data } = await listCliAgentRuns({
          query: { chatContextId, status: ACTIVE_CLI_RUN_STATUS },
          throwOnError: true,
        })
        if (!cancelled) setDiscoveredRunId(pickActiveCliRunId(data, chatContextId))
      } catch {
        if (!cancelled) setDiscoveredRunId(undefined)
      }
    }
    void discover()
    const off = ws.on('cli:run-update', (data) => {
      if (isCliRunLifecycleEvent(data)) void discover()
    })
    return () => {
      cancelled = true
      off()
    }
  }, [runId, chatContextId, ws])

  const activeRunId = runId ?? discoveredRunId

  // CLI gated actions for this CHAT — initial fetch + refresh only when an action
  // is raised or decided (not on every transcript/status tick, which would spam
  // the endpoint during a verbose run).
  //
  // Scoped to the chat, NOT to a run: a gated call no longer holds its run open
  // while it waits, so the agent routinely ends its turn with the approval still
  // pending and retries on a later run. Reading by `runId` would hide the prompt
  // the agent just told the user about, the moment its run went terminal.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await listPendingCliAgentActions({
          query: { chatContextId },
          throwOnError: true,
        })
        // Drop notification-only kinds (e.g. auth-expired) — they're not
        // approvable grants and must never surface as a permission popup.
        if (!cancelled) setCliActions(data.filter(isToolGrantAction))
      } catch {
        if (!cancelled) setCliActions([])
      }
    }
    void load()
    const off = ws.on('cli:run-update', (data) => {
      if (isCliActionUpdateEvent(data)) void load()
    })
    return () => {
      cancelled = true
      off()
    }
  }, [chatContextId, ws])

  // API batch auto-commit: once every pending tool-call has a decision, resume
  // the completion granting the approved subset, then clear the local choices.
  const allApiDecided =
    apiToolCalls.length > 0 && apiToolCalls.every((tc) => tc.toolCallId in apiDecisions)
  useEffect(() => {
    if (!allApiDecided) return
    const grantedIds = apiToolCalls
      .filter((tc) => apiDecisions[tc.toolCallId])
      .map((tc) => tc.toolCallId)
    setApiDecisions({})
    void confirmTools(ctx, grantedIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allApiDecided])

  const decideApi = useCallback((toolCallId: string, decision: PendingToolGrantDecision) => {
    if (decision === 'permanent') {
      throw new Error('Permanent grants are CLI-only')
    }
    setApiDecisions((prev) => ({ ...prev, [toolCallId]: decision === 'once' }))
  }, [])

  const decideCli = useCallback(
    async (action: PendingAction, decision: PendingToolGrantDecision) => {
      // Declining a question isn't a permission denial: the agent is told to
      // carry on with its own judgement, so the answer rides along on `denied`.
      const body =
        isQuestionAction(action) && decision === 'deny'
          ? declineDecision()
          : { outcome: cliDecideOutcome(decision) }
      await decideCliAgentAction({ path: { actionId: action.id }, body, throwOnError: true })
      setCliActions((prev) => prev.filter((a) => a.id !== action.id))
    },
    [],
  )

  const answerCli = useCallback(async (actionId: string, answer: string) => {
    await decideCliAgentAction({
      path: { actionId },
      body: answerDecision(answer),
      throwOnError: true,
    })
    setCliActions((prev) => prev.filter((a) => a.id !== actionId))
  }, [])

  const grants = useMemo<PendingToolGrant[]>(() => {
    const apiGrants = apiToolCalls.map<PendingToolGrant>((tc) => ({
      ...apiToolCallToGrant(tc),
      decide: async (decision) => decideApi(tc.toolCallId, decision),
    }))
    const cliGrants = cliActions.map<PendingToolGrant>((action) => {
      const data = cliPendingActionToGrant(action)
      return {
        ...data,
        decide: (decision) => decideCli(action, decision),
        ...(data.question ? { answer: (text: string) => answerCli(action.id, text) } : {}),
      }
    })
    return [...apiGrants, ...cliGrants]
  }, [apiToolCalls, cliActions, decideApi, decideCli, answerCli])

  return { grants, ...(activeRunId ? { cliRunId: activeRunId } : {}) }
}
