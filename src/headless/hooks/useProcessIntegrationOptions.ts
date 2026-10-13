import { useCallback, useEffect, useState } from 'react'
import type { ProcessIntegrationOptions } from 'thefactory-tools/types'
import { extractErrorMessage, getProcessRunIntegrationOptions, useAuth } from '../api'
import { integrationOptionsCache } from './processViewCache'

export type UseProcessIntegrationOptions = {
  /** What approving the run's work offers and starts from; `undefined` until read. */
  options: ProcessIntegrationOptions | undefined
  /** Why it could not be read. */
  error: string | null
  refresh: () => Promise<void>
}

/** Reads under way, by run id: the sign-off and the chooser asking at once share one. */
const readsInFlight = new Map<string, Promise<ProcessIntegrationOptions>>()

function readIntegrationOptionsShared(runId: string): Promise<ProcessIntegrationOptions> {
  const inFlight = readsInFlight.get(runId)
  if (inFlight) return inFlight
  const read = getProcessRunIntegrationOptions({ path: { runId }, throwOnError: true })
    .then(({ data }) => {
      const options = data as ProcessIntegrationOptions
      integrationOptionsCache.set(runId, options)
      return options
    })
    .finally(() => readsInFlight.delete(runId))
  readsInFlight.set(runId, read)
  return read
}

/**
 * What approving a run's work offers — who it can land as, the accounts a pull
 * request can be opened as, the commits that ship and the words each way
 * starts from — read when `runId` is given (the person opened the approval).
 * What was last read for the run paints at once (`processViewCache`) and is
 * read again behind it; reads asked for together are one request.
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
      setRead({ runId, options: await readIntegrationOptionsShared(runId) })
      setError(null)
    } catch (err) {
      setError(extractErrorMessage(err, 'Who it can be committed as could not be read.'))
    }
  }, [runId])

  useEffect(() => {
    if (!token || !runId) return
    void refresh()
  }, [token, runId, refresh])

  return {
    options:
      read && read.runId === runId
        ? read.options
        : runId
          ? integrationOptionsCache.get(runId)
          : undefined,
    error,
    refresh,
  }
}
