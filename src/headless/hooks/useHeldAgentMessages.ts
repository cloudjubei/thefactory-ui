import { useCallback, useMemo, useState } from 'react'
import { getChatContext } from 'thefactory-tools/utils'
import { deliverHeldAgentMessage, discardHeldAgentMessage } from '../api/generated'
import { heldAgentMessageViews } from '../utils/heldAgentMessages'
import type { HeldAgentMessageView } from '../utils/heldAgentMessagesTypes'

export type UseHeldAgentMessages = {
  /** The agent messages held for this chat, oldest first. */
  items: HeldAgentMessageView[]
  deliverNow: (id: string) => Promise<void>
  discard: (id: string) => Promise<void>
  /** The message a decision is under way for. */
  workingId: string | undefined
}

/**
 * The messages other agents sent this chat while it was busy, held until it is
 * free, and the person's say over them: deliver one now, or drop it. The list
 * comes back with the chat once the backend has acted on it.
 */
export function useHeldAgentMessages(
  chatId: string | undefined,
  metadata: Record<string, unknown> | undefined,
): UseHeldAgentMessages {
  const items = useMemo(() => heldAgentMessageViews(metadata), [metadata])
  const [workingId, setWorkingId] = useState<string | undefined>(undefined)
  const act = useCallback(
    async (id: string, deliver: boolean) => {
      const context = chatId ? getChatContext(chatId) : undefined
      if (!context) return
      setWorkingId(id)
      try {
        if (deliver) {
          await deliverHeldAgentMessage({ body: { context, id }, throwOnError: true })
        } else {
          await discardHeldAgentMessage({ body: { context, id }, throwOnError: true })
        }
      } finally {
        setWorkingId(undefined)
      }
    },
    [chatId],
  )
  const deliverNow = useCallback((id: string) => act(id, true), [act])
  const discard = useCallback((id: string) => act(id, false), [act])
  return { items, deliverNow, discard, workingId }
}
