import { useCallback, useState } from 'react'

import { extractErrorMessage, openProcessGroupRunChat } from '../api'
import type { ProcessRunChatOpened } from './useProcessRun'

export type UseProcessGroupRunChat = {
  /** Open a chat for the whole group on the run: the one it reports to, or a new one its updates go to from now on. */
  open: () => Promise<ProcessRunChatOpened | undefined>
  busy: boolean
  /** Why the last open was refused — cleared by the next one. */
  error: string | null
}

/** A group run's chat, opened on demand from its page — a run started from a group story has none until then. */
export function useProcessGroupRunChat(groupRunId: string | undefined): UseProcessGroupRunChat {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = useCallback(async (): Promise<ProcessRunChatOpened | undefined> => {
    if (!groupRunId) return undefined
    setError(null)
    setBusy(true)
    try {
      const { data } = await openProcessGroupRunChat({
        path: { groupRunId },
        throwOnError: true,
      })
      return data as ProcessRunChatOpened
    } catch (err) {
      setError(extractErrorMessage(err, 'The group run’s chat could not be opened.'))
      return undefined
    } finally {
      setBusy(false)
    }
  }, [groupRunId])

  return { open, busy, error }
}
