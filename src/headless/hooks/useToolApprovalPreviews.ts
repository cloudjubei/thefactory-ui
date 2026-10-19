import { useEffect, useRef, useState } from 'react'

import type { ToolPreviewResult } from '../api/sdkTypes'
import type { ChatMessageLike } from '../utils/chatTypes'
import { chatToolPreviewOf } from '../utils/toolPreview'
import { toolApprovalPreviewError, toolCallsAwaitingPreview } from '../utils/toolApprovalPreviews'

/** Host-supplied fetcher for the result a call would have if it were approved. */
export type ToolApprovalPreviewFetcher = (
  toolCallId: string,
  toolName: string,
  args: unknown,
) => Promise<ToolPreviewResult>

/**
 * The proposed result of each call in a chat that waits on an approval decided
 * on its row, by tool-call id — `{ status: 'pending' }` while it loads, the
 * preview once ready, or `{ status: 'error' }`. Reset when the chat changes.
 * Without a fetcher nothing is asked for.
 */
export function useToolApprovalPreviews(
  chatId: string | undefined,
  messages: readonly ChatMessageLike[],
  previewTool: ToolApprovalPreviewFetcher | undefined,
): Record<string, unknown> {
  const [previews, setPreviews] = useState<Record<string, unknown>>({})
  const previewsRef = useRef<Record<string, unknown>>({})

  useEffect(() => {
    previewsRef.current = previews
  }, [previews])

  useEffect(() => {
    setPreviews({})
    previewsRef.current = {}
  }, [chatId])

  useEffect(() => {
    if (!previewTool) return
    for (const call of toolCallsAwaitingPreview(messages, previewsRef.current)) {
      const settle = (value: unknown) => {
        previewsRef.current = { ...previewsRef.current, [call.toolCallId]: value }
        setPreviews((prev) => ({ ...prev, [call.toolCallId]: value }))
      }
      settle({ status: 'pending' })
      void (async () => {
        try {
          const ready = chatToolPreviewOf(
            await previewTool(call.toolCallId, call.toolName, call.args),
          )
          if (ready) settle(ready)
        } catch (e) {
          settle(toolApprovalPreviewError(e))
        }
      })()
    }
  }, [previewTool, messages])

  return previews
}
