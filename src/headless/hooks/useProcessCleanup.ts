import { useCallback, useEffect, useState } from 'react'
import type { ProcessCleanupList, ProcessRun } from 'thefactory-tools/types'
import {
  extractErrorMessage,
  getProcessRunCleanup,
  setProcessRunCleanupItem,
  setProcessRunCleanupOff,
  useApi,
  useAuth,
} from '../api'

export type UseProcessCleanup = {
  list: ProcessCleanupList | undefined
  loadError: string | null
  /** Why the last change was refused — shown on the card, cleared by the next one. */
  actionError: string | null
  busy: boolean
  /** Keep (`false`) or remove (`true`) one item once the sign-off is approved. */
  setItemSelected: (itemId: string, selected: boolean) => Promise<void>
  /** Switch the run's cleanup off, or back on. */
  setOff: (off: boolean) => Promise<void>
}

/**
 * A process run's cleanup list — what its cleanup step removes once its
 * sign-off is approved — kept current as the run changes, with the person's ticks.
 */
export function useProcessCleanup(runId: string | undefined): UseProcessCleanup {
  const { token } = useAuth()
  const { ws } = useApi()
  const [list, setList] = useState<ProcessCleanupList | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!runId) {
      setList(undefined)
      return
    }
    try {
      const { data } = await getProcessRunCleanup({ path: { runId }, throwOnError: true })
      setList(data as ProcessCleanupList)
      setLoadError(null)
    } catch (err) {
      setLoadError(extractErrorMessage(err, 'The cleanup list could not be loaded.'))
    }
  }, [runId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!runId) return
    return ws.on('process:run-update', (data: unknown) => {
      const update = data as { runId?: string; run?: ProcessRun }
      if (update?.runId === runId) void refresh()
    })
  }, [ws, runId, refresh])

  const act = useCallback(
    async (change: (id: string) => Promise<{ data?: unknown }>) => {
      if (!runId) return
      setBusy(true)
      setActionError(null)
      try {
        const { data } = await change(runId)
        if (data) setList(data as ProcessCleanupList)
      } catch (err) {
        setActionError(extractErrorMessage(err, 'Your choice could not be recorded.'))
      } finally {
        setBusy(false)
      }
    },
    [runId],
  )

  const setItemSelected = useCallback(
    (itemId: string, selected: boolean) =>
      act((id) =>
        setProcessRunCleanupItem({
          path: { runId: id },
          body: { itemId, selected },
          throwOnError: true,
        }),
      ),
    [act],
  )

  const setOff = useCallback(
    (off: boolean) =>
      act((id) =>
        setProcessRunCleanupOff({ path: { runId: id }, body: { off }, throwOnError: true }),
      ),
    [act],
  )

  return { list, loadError, actionError, busy, setItemSelected, setOff }
}
