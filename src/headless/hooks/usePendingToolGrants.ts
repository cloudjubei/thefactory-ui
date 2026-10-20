import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getChatContextKey } from 'thefactory-tools/utils'
import {
  cancelCliAgentAction,
  decideCliAgentAction,
  getChatTurn,
  listCliAgentRunSummaries,
  listPendingCliAgentActions,
  trustSite,
  type ChatContext,
  type ChatContextAgentRunStory,
  type PendingAction,
} from '../api/generated'
import { useApi } from '../api'
import { pendingChatActionsCache } from './chatAsksCache'
import type {
  PendingToolGrant,
  PendingToolGrantDecision,
  PendingToolGrantDecisionVia,
} from '../utils/chatTypes'
import {
  cliDecideOutcome,
  cliPendingActionToGrant,
  isCliActionUpdateEvent,
  chatTurnActivity,
  isCliRunLifecycleEvent,
  isToolGrantAction,
  pickActiveCliRunId,
  pickActiveStoryRunId,
  cliActionEventConcernsChat,
  cliRunLifecycleConcernsChat,
  trustableSiteOf,
} from '../utils/pendingToolGrants'
import { answerDecision, declineDecision, isQuestionAction } from '../utils/agentQuestions'
import { decisionGrantScope } from '../utils/alwaysAllow'
import { declineRemedyDecision, remedyChoiceDecision } from '../utils/agentRemedy'
import type { AgentRemedyDecision } from '../utils/agentRemedyTypes'

/**
 * The run a chat is currently EXECUTING, which is what the run view mounts on.
 * Approvals are no longer read from it — a pending approval outlives the run
 * that raised it, so those are read per chat.
 */
const ACTIVE_CLI_RUN_STATUS = 'running' as const

export type UsePendingToolGrants = {
  /** The chat's asks awaiting a decision — an API turn's and a CLI run's alike — as the broker lists them. */
  grants: PendingToolGrant[]
  /**
   * The CLI run the grants were read from — the caller's `runId` when it had
   * one, otherwise the chat's active run as resolved from the backend. Callers
   * gate the approval surface on this rather than on their own live state, which
   * a reload or remount loses while the agent stays blocked.
   */
  cliRunId?: string
  /**
   * Whether a turn of this chat is GENUINELY executing right now — a backend CLI
   * run in `running` status, or a turn the server runs on the API — independent of any run id the caller is still
   * displaying. Drive the "busy / Stop" affordance off this, NOT off
   * {@link cliRunId}: a terminal run keeps its id set for the transcript view and
   * for a still-pending approval, so `cliRunId !== undefined` stays true long
   * after the agent stopped working — which left the Stop button spinning after
   * a successful abort. This self-corrects to false the instant nothing runs.
   */
  isRunActive: boolean
}

/**
 * Every ask a chat is waiting on, as {@link PendingToolGrant}s: the broker's
 * pending actions for the chat — raised by an API chat turn or a CLI run, the
 * same records either way — each decided on its own through
 * `decideCliAgentAction`, with an always-allow's scope (this chat, or
 * everywhere), the person's edits in its metadata, and where they decided it.
 *
 * `runId` is an optimisation, not a requirement: when the caller doesn't have
 * one the hook resolves the chat's active CLI run itself, so an approval the
 * agent is blocked on stays reachable across a reload.
 */
export function usePendingToolGrants(ctx: ChatContext, runId?: string): UsePendingToolGrants {
  const { ws } = useApi()

  const chatContextId = getChatContextKey(ctx)
  // The asks as loaded for one chat — another chat's never show while this
  // chat's own load is on its way; what this chat last read as does.
  const [loadedActions, setLoadedActions] = useState<{
    chatContextId: string
    actions: PendingAction[]
  }>()
  const cliActions = useMemo(
    () =>
      loadedActions?.chatContextId === chatContextId
        ? loadedActions.actions
        : (pendingChatActionsCache.get(chatContextId) ?? []),
    [loadedActions, chatContextId],
  )
  const setCliActions = useCallback(
    (next: PendingAction[] | ((prev: PendingAction[]) => PendingAction[])) =>
      setLoadedActions((prev) => {
        const current =
          prev?.chatContextId === chatContextId
            ? prev.actions
            : (pendingChatActionsCache.get(chatContextId) ?? [])
        return { chatContextId, actions: typeof next === 'function' ? next(current) : next }
      }),
    [chatContextId],
  )
  useEffect(() => {
    if (loadedActions)
      pendingChatActionsCache.set(loadedActions.chatContextId, loadedActions.actions)
  }, [loadedActions])
  // Kept WITH the chat it was found for: after a switch, the previous chat's
  // run stayed the answer until the new lookup returned, and a view that
  // holds a run past its end held the other chat's run for good.
  const [discovered, setDiscovered] = useState<{ chatContextId: string; runId?: string }>()

  // Always ask the backend which run this chat has GENUINELY executing, even
  // when the caller passed a runId. Two reasons: a reload or remount drops the
  // caller's live runId (so a cold page still needs discovery to reach a blocked
  // approval), AND — the reason this no longer short-circuits on `runId` — the
  // caller's runId outlives the run it names (kept for the transcript view and a
  // pending approval), so it cannot answer "is a run running now". Only a
  // `status: 'running'` probe can, and `isRunActive` is derived from it.
  // Re-resolved on run lifecycle events (not a timer) so start/end/resume is
  // picked up live, and on a reconnect — a backend restart parks its runs
  // `paused` without any event.
  // A STORY agent-run chat's work may run in per-feature sub-runs keyed to their
  // feature chats, so asking by `chatContextId` alone misses them. Ask by
  // `storyId` — the handle every run in the story carries — and let
  // `pickActiveStoryRunId` keep only this agent run's own run and sub-runs, not
  // another process step's agent running in the same story.
  const storyRun = ctx.type === 'AGENT_RUN_STORY' ? ctx : undefined
  const storyProjectId = storyRun?.projectId
  const storyId = storyRun?.storyId
  const storyAgentRunId = storyRun?.agentRunId
  const storyChat = useMemo<ChatContextAgentRunStory | undefined>(
    () =>
      storyProjectId !== undefined && storyId !== undefined && storyAgentRunId !== undefined
        ? {
            type: 'AGENT_RUN_STORY',
            projectId: storyProjectId,
            storyId,
            agentRunId: storyAgentRunId,
          }
        : undefined,
    [storyProjectId, storyId, storyAgentRunId],
  )

  useEffect(() => {
    let cancelled = false
    const discover = async () => {
      try {
        const { data } = await listCliAgentRunSummaries({
          query: storyChat
            ? { storyId: storyChat.storyId, status: ACTIVE_CLI_RUN_STATUS }
            : { chatContextId, status: ACTIVE_CLI_RUN_STATUS },
          throwOnError: true,
        })
        if (cancelled) return
        setDiscovered({
          chatContextId,
          runId: storyChat
            ? pickActiveStoryRunId(data, storyChat)
            : pickActiveCliRunId(data, chatContextId),
        })
      } catch {
        if (!cancelled) setDiscovered({ chatContextId })
      }
    }
    void discover()
    const off = ws.on('cli:run-update', (data) => {
      if (!isCliRunLifecycleEvent(data)) return
      if (storyChat || cliRunLifecycleConcernsChat(data, chatContextId)) void discover()
    })
    const offReconnect = ws.onReconnect(() => void discover())
    return () => {
      cancelled = true
      off()
      offReconnect()
    }
  }, [chatContextId, storyChat, ws])

  // A turn the server runs with no CLI run behind it — an API chat carried on
  // after a decision, or sent from another client — is busy the same way, and
  // is re-read on a reconnect the same way: a restart ends it without an event.
  const [apiTurn, setApiTurn] = useState<{ chatContextId: string; active: boolean }>()
  useEffect(() => {
    let cancelled = false
    const read = () => {
      void getChatTurn({ query: { chatContextId }, throwOnError: true })
        .then(({ data }) => {
          if (!cancelled) setApiTurn({ chatContextId, active: data.active })
        })
        .catch(() => {})
    }
    read()
    const off = ws.on('completion:turn', (data) => {
      const active = chatTurnActivity(data, chatContextId)
      if (active !== undefined) setApiTurn({ chatContextId, active })
    })
    const offReconnect = ws.onReconnect(read)
    return () => {
      cancelled = true
      off()
      offReconnect()
    }
  }, [chatContextId, ws])
  const apiTurnActive = apiTurn?.chatContextId === chatContextId && apiTurn.active

  const discoveredRunId = discovered?.chatContextId === chatContextId ? discovered.runId : undefined
  const activeRunId = runId ?? discoveredRunId

  // CLI gated actions for this CHAT — initial fetch + refresh only when an action
  // is raised or decided (not on every transcript/status tick, which would spam
  // the endpoint during a verbose run).
  //
  // Scoped to the chat, NOT to a run: a gated call no longer holds its run open
  // while it waits, so the agent routinely ends its turn with the approval still
  // pending and retries on a later run. Reading by `runId` would hide the prompt
  // the agent just told the user about, the moment its run went terminal.
  const cliActionsRef = useRef(cliActions)
  cliActionsRef.current = cliActions
  const loadSeqRef = useRef(0)
  const loadCliActions = useCallback(async () => {
    // Sequence guard: a slow response for the PREVIOUS chat (or an older
    // refresh) must not clobber the list a newer load already applied.
    const seq = ++loadSeqRef.current
    try {
      const { data } = await listPendingCliAgentActions({
        query: { chatContextId },
        throwOnError: true,
      })
      // Drop notification-only kinds (e.g. auth-expired) — they're not
      // approvable grants and must never surface as a permission popup.
      if (loadSeqRef.current === seq) setCliActions(data.filter(isToolGrantAction))
    } catch {
      // Keep what is shown: an empty list read every row's ask as "did not
      // run" while the backend restarted, and nothing re-read it after.
    }
  }, [chatContextId])
  useEffect(() => {
    void loadCliActions()
    const off = ws.on('cli:run-update', (data) => {
      if (!isCliActionUpdateEvent(data)) return
      const shows = (id: string) => cliActionsRef.current.some((a) => a.id === id)
      if (cliActionEventConcernsChat(data, chatContextId, shows)) void loadCliActions()
    })
    const offReconnect = ws.onReconnect(() => void loadCliActions())
    return () => {
      off()
      offReconnect()
    }
  }, [loadCliActions, ws, chatContextId])

  const decideCli = useCallback(
    async (
      action: PendingAction,
      decision: PendingToolGrantDecision,
      metadata?: Record<string, unknown>,
      via: PendingToolGrantDecisionVia = 'card',
    ) => {
      const grantScope = decisionGrantScope(decision, action.chatContextId)
      // Declining a question isn't a permission denial: the agent is told to
      // carry on with its own judgement, so the answer rides along on `denied`.
      const body =
        isQuestionAction(action) && decision === 'deny'
          ? declineDecision()
          : {
              outcome: cliDecideOutcome(decision),
              decidedVia: via,
              ...(grantScope ? { grantScope } : {}),
              // Options the user set ON the approval (e.g. capture proof). The
              // host whitelists these — a decision cannot redirect the run.
              ...(metadata ? { metadata } : {}),
            }
      try {
        // Trusting the site is its own rule, made first; the ask itself is then approved.
        const site = decision === 'trust-site' ? trustableSiteOf(action) : undefined
        if (site) await trustSite({ body: { site }, throwOnError: true })
        await decideCliAgentAction({ path: { actionId: action.id }, body, throwOnError: true })
        setCliActions((prev) => prev.filter((a) => a.id !== action.id))
      } catch (err) {
        // The route refuses an already-terminal action with 409 (e.g. the
        // approval expired while it was displayed). Re-read server truth so a
        // dead grant stops rendering, then rethrow — the deciding surface must
        // SHOW the refusal; a silent no-op is what lost the launch approval.
        void loadCliActions()
        throw err
      }
    },
    [loadCliActions, setCliActions],
  )

  const answerCli = useCallback(
    async (actionId: string, answer: string) => {
      try {
        await decideCliAgentAction({
          path: { actionId },
          body: answerDecision(answer),
          throwOnError: true,
        })
        setCliActions((prev) => prev.filter((a) => a.id !== actionId))
      } catch (err) {
        void loadCliActions()
        throw err
      }
    },
    [loadCliActions, setCliActions],
  )

  /**
   * Withdraw an ask instead of answering it.
   *
   * A question takes the composer, so this is the only way back to typing
   * freely without putting words in the agent's mouth. Deliberately NOT a
   * `denied` decision: deny is an answer ("no") the agent acts on and continues
   * from, cancel takes the question off the table and resumes nothing.
   */
  const cancelCli = useCallback(
    async (actionId: string) => {
      try {
        await cancelCliAgentAction({ path: { actionId }, body: {}, throwOnError: true })
        setCliActions((prev) => prev.filter((a) => a.id !== actionId))
      } catch (err) {
        void loadCliActions()
        throw err
      }
    },
    [loadCliActions, setCliActions],
  )

  const resolveRemedyCli = useCallback(
    async (actionId: string, body: AgentRemedyDecision) => {
      try {
        await decideCliAgentAction({ path: { actionId }, body, throwOnError: true })
        setCliActions((prev) => prev.filter((a) => a.id !== actionId))
      } catch (err) {
        void loadCliActions()
        throw err
      }
    },
    [loadCliActions, setCliActions],
  )

  const grants = useMemo<PendingToolGrant[]>(
    () =>
      cliActions.map<PendingToolGrant>((action) => {
        const data = cliPendingActionToGrant(action)
        return {
          ...data,
          decide: (decision, metadata, via) => decideCli(action, decision, metadata, via),
          ...(data.question
            ? {
                answer: (text: string) => answerCli(action.id, text),
                cancel: () => cancelCli(action.id),
              }
            : {}),
          ...(data.remedy
            ? {
                resolveRemedy: (remedyId: string, value?: string) =>
                  resolveRemedyCli(action.id, remedyChoiceDecision(remedyId, value)),
                dismissRemedy: () => resolveRemedyCli(action.id, declineRemedyDecision()),
              }
            : {}),
        }
      }),
    [cliActions, decideCli, answerCli, cancelCli, resolveRemedyCli],
  )

  return {
    grants,
    isRunActive: discoveredRunId !== undefined || apiTurnActive,
    ...(activeRunId ? { cliRunId: activeRunId } : {}),
  }
}
