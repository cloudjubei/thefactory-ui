import { useCallback, useEffect, useState } from 'react'
import type { ProcessRunChanges } from 'thefactory-tools/types'

import { extractErrorMessage, getProcessRunChanges, useAuth } from '../api'
import { PROCESS_CHANGES_UNREADABLE } from '../utils/processRunChangesConstants'
import { processRunChangesCache } from './processViewCache'

export type UseProcessRunChanges = {
  /** What the run's work changes; `undefined` until read. */
  changes: ProcessRunChanges | undefined
  /** Why they could not be read. */
  error: string | undefined
  loading: boolean
  reload: () => Promise<void>
}

/**
 * What a run's work changes, file by file with patches, read when `runId` is
 * given (a run with a work branch). What was last read for the run paints at
 * once (`processViewCache`) and is read again behind it.
 */
export function useProcessRunChanges(runId: string | undefined): UseProcessRunChanges {
  const { token } = useAuth()
  const [read, setRead] = useState<{ runId: string; changes: ProcessRunChanges } | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!runId) return
    setLoading(true)
    try {
      const { data } = await getProcessRunChanges({ path: { runId }, throwOnError: true })
      const changes = data as ProcessRunChanges
      processRunChangesCache.set(runId, changes)
      setRead({ runId, changes })
      setError(undefined)
    } catch (err) {
      setError(extractErrorMessage(err, PROCESS_CHANGES_UNREADABLE))
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    if (!token || !runId) return
    void reload()
  }, [token, runId, reload])

  const changes =
    read && read.runId === runId
      ? read.changes
      : runId
        ? processRunChangesCache.get(runId)
        : undefined
  return { changes, error: changes ? undefined : error, loading, reload }
}
