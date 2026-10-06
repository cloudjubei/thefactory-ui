import { useCallback, useEffect, useState } from 'react'
import type { ProcessIntegrationOptions } from 'thefactory-tools/types'
import { extractErrorMessage, getProcessRunIntegrationOptions, useAuth } from '../api'

export type UseProcessIntegrationOptions = {
  /** What approving the run's work offers and starts from; `undefined` until read. */
  options: ProcessIntegrationOptions | undefined
  /** Why it could not be read. */
  error: string | null
  refresh: () => Promise<void>
}

/**
 * What approving a run's work offers — who it can land as, the accounts a pull
 * request can be opened as, the commits that ship and the words each way
 * starts from — read when `runId` is given (the person opened the approval).
 */
export function useProcessIntegrationOptions(
  runId: string | undefined,
): UseProcessIntegrationOptions {
  const { token } = useAuth()
  const [read, setRead] = useState<{ runId: string; options: ProcessIntegrationOptions } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!runId) return
    try {
      const { data } = await getProcessRunIntegrationOptions({
        path: { runId },
        throwOnError: true,
      })
      setRead({ runId, options: data as ProcessIntegrationOptions })
      setError(null)
    } catch (err) {
      setError(extractErrorMessage(err, 'What it can land as could not be read.'))
    }
  }, [runId])

  useEffect(() => {
    if (!token || !runId) return
    void refresh()
  }, [token, runId, refresh])

  return {
    options: read && read.runId === runId ? read.options : undefined,
    error,
    refresh,
  }
}
