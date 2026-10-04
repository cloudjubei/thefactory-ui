import { useMemo, useRef } from 'react'
import { liveRunToShow } from '../utils/liveRunHandoff'

/**
 * The CLI run a chat shows as in flight — the live one, or the one that just
 * ended until the chat's messages carry it (see `liveRunToShow`). Forgotten
 * when the chat changes.
 */
export function useShownLiveRun(
  chatId: string | undefined,
  live: string | undefined,
  messages: readonly { cliRunId?: string | null }[],
): string | undefined {
  const heldRef = useRef<{ chatId: string | undefined; runId?: string }>({ chatId })
  if (heldRef.current.chatId !== chatId) heldRef.current = { chatId }
  if (live !== undefined) heldRef.current.runId = live
  const persistedRunIds = useMemo(() => {
    const ids = new Set<string>()
    for (const m of messages) if (m.cliRunId) ids.add(m.cliRunId)
    return ids
  }, [messages])
  const shown = liveRunToShow({ live, held: heldRef.current.runId, persistedRunIds })
  if (shown === undefined) heldRef.current.runId = undefined
  return shown
}
