import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RunDiagnostics } from 'thefactory-tools/types'
import { getRunDiagnostics } from '../api'
import { useApi, useAuth } from '../api'

export type UseRunDiagnostics = {
  isLoaded: boolean
  loadError: Error | null
  diagnostics: RunDiagnostics | undefined
  refresh: () => Promise<void>
}

/**
 * One run's flight recorder, kept live.
 *
 * Read-only: the trail is written server-side at the run's seams. It grows as
 * the run progresses, so a re-fetch is triggered off the same `process:run-update`
 * event the pipeline listens to — the Debug view moves with the run.
 *
 * `enabled` (default true) gates the fetch: the Debug surfaces pass the user's
 * `showRunDiagnostics` preference, so a run costs nothing to watch until someone
 * actually opens its diagnostics.
 */
export function useRunDiagnostics(
  runId: string | undefined,
  opts: { enabled?: boolean } = {},
): UseRunDiagnostics {
  const enabled = opts.enabled !== false
  const { token } = useAuth()
  const { ws } = useApi()
  const [diagnostics, setDiagnostics] = useState<RunDiagnostics | undefined>(undefined)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!runId || !enabled) {
      setDiagnostics(undefined)
      setIsLoaded(true)
      return
    }
    try {
      const { data } = await getRunDiagnostics({ path: { runId }, throwOnError: true })
      setDiagnostics(data as RunDiagnostics)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [runId, enabled])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!runId || !enabled) return
    return ws.on('process:run-update', (data: unknown) => {
      const update = data as { runId?: string }
      if (update?.runId === runId) void refresh()
    })
  }, [ws, runId, enabled, refresh])

  return useMemo<UseRunDiagnostics>(
    () => ({ isLoaded, loadError, diagnostics, refresh }),
    [isLoaded, loadError, diagnostics, refresh],
  )
}
