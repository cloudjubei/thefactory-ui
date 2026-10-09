import { useEffect, useRef, useState } from 'react'
import { canAutoDispatch, isComposerBlocked, pendingTurnStep } from '../utils/chatDraft'
import type { ChatComposerBlockers, PendingTurnState } from '../utils/chatDraftTypes'
import type { ChatPendingQueue } from './useChatComposer'

export type UsePendingAutoDispatchInput = {
  chatId: string | undefined
  queue: ChatPendingQueue | undefined
  busy: boolean
  /** The turn that just ended failed. */
  failed: boolean
  blockers: ChatComposerBlockers
}

/**
 * Sends a chat's queued messages, merged, once the turn they waited for ends —
 * only when the composer is free and the person has not paused the queue, and
 * never for a queue it did not see a turn end for (one restored after a reload
 * waits for "Send"). A failed turn pauses the queue.
 */
export function usePendingAutoDispatch({
  chatId,
  queue,
  busy,
  failed,
  blockers,
}: UsePendingAutoDispatchInput): void {
  const pendingCount = queue?.items.length ?? 0
  const blocked = isComposerBlocked(blockers)
  const [turn, setTurn] = useState<PendingTurnState>({ wasBusy: busy, turnEnded: false })
  const chatIdRef = useRef(chatId)

  useEffect(() => {
    if (chatIdRef.current !== chatId) {
      chatIdRef.current = chatId
      setTurn({ wasBusy: busy, turnEnded: false })
      return
    }
    const step = pendingTurnStep(turn, { busy, failed, blocked, pendingCount })
    if (step.pause) queue?.pause()
    if (step.wasBusy !== turn.wasBusy || step.turnEnded !== turn.turnEnded) {
      setTurn({ wasBusy: step.wasBusy, turnEnded: step.turnEnded })
    }
  }, [chatId, busy, failed, blocked, pendingCount, turn, queue])

  useEffect(() => {
    if (!queue) return
    if (
      !canAutoDispatch({
        pendingCount,
        busy,
        paused: queue.paused,
        turnEnded: turn.turnEnded,
        blockers,
      })
    )
      return
    setTurn((prev) => ({ ...prev, turnEnded: false }))
    void queue.sendNow()
  }, [queue, pendingCount, busy, turn.turnEnded, blockers])
}
