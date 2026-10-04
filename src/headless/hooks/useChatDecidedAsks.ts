import { useEffect, useRef, useState } from 'react'
import { listDecidedCliAgentActions, useApi } from '../api'
import type { CliDecidedAsk } from '../utils/cliRunActivityTypes'
import {
  cliDecidedAsks,
  isAskOutcomeEvent,
  withDecidedAction,
  type CliDecidedActionLike,
} from '../utils/pendingToolGrants'
import { createCoalescedRefresh } from '../utils/runUpdateRefresh'

/**
 * The chat's decided asks — what each row that once waited on an ask shows now
 * (see `cliTranscriptToMessages`). Read once per chat; a decision or a carried-
 * out approval is folded in straight from its event when the ask is one this
 * chat holds (`pendingAskIds`, or already decided here) — a re-read alone left
 * the row "not run" for the moment between the ask leaving the pending list and
 * the re-read landing — and the list is re-read behind it. A failed read keeps
 * what is shown.
 */
export function useChatDecidedAsks(
  chatContextId: string | undefined,
  pendingAskIds: readonly string[] = [],
): readonly CliDecidedAsk[] {
  const { ws } = useApi()
  const [asks, setAsks] = useState<readonly CliDecidedAsk[]>([])
  const pendingRef = useRef(pendingAskIds)
  pendingRef.current = pendingAskIds
  useEffect(() => {
    setAsks([])
    if (!chatContextId) return
    let cancelled = false
    const load = createCoalescedRefresh(async () => {
      try {
        const { data } = await listDecidedCliAgentActions({
          query: { chatContextId },
          throwOnError: true,
        })
        if (!cancelled) setAsks(cliDecidedAsks(data as CliDecidedActionLike[]))
      } catch {
        /* keep what is shown */
      }
    })
    void load()
    const off = ws.on('cli:run-update', (data: unknown) => {
      if (!isAskOutcomeEvent(data)) return
      const action = (data as { event?: { action?: CliDecidedActionLike } }).event?.action
      if (action) {
        setAsks((prev) =>
          action.chatContextId === chatContextId ||
          pendingRef.current.includes(action.id) ||
          prev.some((a) => a.id === action.id)
            ? withDecidedAction(prev, action)
            : prev,
        )
      }
      void load()
    })
    return () => {
      cancelled = true
      off()
    }
  }, [chatContextId, ws])
  return asks
}
