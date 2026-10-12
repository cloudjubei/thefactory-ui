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
import { decidedChatAsksCache } from './chatAsksCache'

const NO_ASKS: readonly CliDecidedAsk[] = []

/**
 * The chat's decided asks — what each row that once waited on an ask shows now
 * (see `cliTranscriptToMessages`). Read once per chat; a decision or a carried-
 * out approval is folded in straight from its event when the ask is one this
 * chat holds (`pendingAskIds`, or already decided here) — a re-read alone left
 * the row "not run" for the moment between the ask leaving the pending list and
 * the re-read landing — and the list is re-read behind it, and again whenever
 * the socket reconnects. A failed read keeps what is shown, and a chat seen
 * before shows what it last read as.
 */
export function useChatDecidedAsks(
  chatContextId: string | undefined,
  pendingAskIds: readonly string[] = [],
): readonly CliDecidedAsk[] {
  const { ws } = useApi()
  // Kept WITH the chat it was read for: after a switch, what this chat last
  // read as shows at once — the rows of a cached transcript must not read "not
  // run" until the re-read lands.
  const [loaded, setLoaded] = useState<{ chatContextId: string; asks: readonly CliDecidedAsk[] }>()
  const asks =
    chatContextId === undefined
      ? NO_ASKS
      : loaded?.chatContextId === chatContextId
        ? loaded.asks
        : (decidedChatAsksCache.get(chatContextId) ?? NO_ASKS)
  const pendingRef = useRef(pendingAskIds)
  pendingRef.current = pendingAskIds
  useEffect(() => {
    if (loaded) decidedChatAsksCache.set(loaded.chatContextId, loaded.asks)
  }, [loaded])
  useEffect(() => {
    if (!chatContextId) return
    let cancelled = false
    const update = (next: (prev: readonly CliDecidedAsk[]) => readonly CliDecidedAsk[]) =>
      setLoaded((prev) => ({
        chatContextId,
        asks: next(
          prev?.chatContextId === chatContextId
            ? prev.asks
            : (decidedChatAsksCache.get(chatContextId) ?? NO_ASKS),
        ),
      }))
    const load = createCoalescedRefresh(async () => {
      try {
        const { data } = await listDecidedCliAgentActions({
          query: { chatContextId },
          throwOnError: true,
        })
        if (!cancelled) update(() => cliDecidedAsks(data as CliDecidedActionLike[]))
      } catch {
        /* keep what is shown */
      }
    })
    void load()
    const off = ws.on('cli:run-update', (data: unknown) => {
      if (!isAskOutcomeEvent(data)) return
      const action = (data as { event?: { action?: CliDecidedActionLike } }).event?.action
      if (action) {
        update((prev) =>
          action.chatContextId === chatContextId ||
          pendingRef.current.includes(action.id) ||
          prev.some((a) => a.id === action.id)
            ? withDecidedAction(prev, action)
            : prev,
        )
      }
      void load()
    })
    const offReconnect = ws.onReconnect(() => void load())
    return () => {
      cancelled = true
      off()
      offReconnect()
    }
  }, [chatContextId, ws])
  return asks
}
