import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  decideCliAgentAction,
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
  isToolGrantAction,
} from '../utils/pendingToolGrants'

export type UsePendingToolGrants = {
  /** Unified API + CLI grants awaiting a decision, in [api…, cli…] order. */
  grants: PendingToolGrant[]
}

/**
 * Unifies the two tool-approval sources behind one {@link PendingToolGrant}[]:
 * API `require_confirmation` tool-calls (resolved as a batch via the chats
 * context's `confirmTools`) and a CLI run's gated `PendingAction`s (resolved
 * individually via `decideCliAgentAction`). API grants accumulate per-row
 * decisions and auto-commit once every row is decided; CLI grants dispatch
 * immediately and support the `'permanent'` decision (`approved-permanent`).
 */
export function usePendingToolGrants(ctx: ChatContext, runId?: string): UsePendingToolGrants {
  const { getChatLiveState, confirmTools } = useChats()
  const { ws } = useApi()

  const apiToolCalls = getChatLiveState(ctx).pendingToolConfirmation?.toolCalls ?? []
  const [apiDecisions, setApiDecisions] = useState<Record<string, boolean>>({})
  const [cliActions, setCliActions] = useState<PendingAction[]>([])

  // CLI gated actions for this run — initial fetch + refresh only when an action
  // is raised or decided (not on every transcript/status tick, which would spam
  // the endpoint during a verbose run).
  useEffect(() => {
    if (!runId) {
      setCliActions([])
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await listPendingCliAgentActions({ query: { runId }, throwOnError: true })
        // Drop notification-only kinds (e.g. auth-expired) — they're not
        // approvable grants and must never surface as a permission popup.
        if (!cancelled) setCliActions(data.filter(isToolGrantAction))
      } catch {
        if (!cancelled) setCliActions([])
      }
    }
    void load()
    const off = ws.on('cli:run-update', (data) => {
      const type = (data as { type?: unknown })?.type
      if (type === 'actionRequest' || type === 'actionDecided') void load()
    })
    return () => {
      cancelled = true
      off()
    }
  }, [runId, ws])

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

  const decideCli = useCallback(async (actionId: string, decision: PendingToolGrantDecision) => {
    await decideCliAgentAction({
      path: { actionId },
      body: { outcome: cliDecideOutcome(decision) },
      throwOnError: true,
    })
    setCliActions((prev) => prev.filter((a) => a.id !== actionId))
  }, [])

  const grants = useMemo<PendingToolGrant[]>(() => {
    const apiGrants = apiToolCalls.map<PendingToolGrant>((tc) => ({
      ...apiToolCallToGrant(tc),
      decide: async (decision) => decideApi(tc.toolCallId, decision),
    }))
    const cliGrants = cliActions.map<PendingToolGrant>((action) => ({
      ...cliPendingActionToGrant(action),
      decide: (decision) => decideCli(action.id, decision),
    }))
    return [...apiGrants, ...cliGrants]
  }, [apiToolCalls, cliActions, decideApi, decideCli])

  return { grants }
}
