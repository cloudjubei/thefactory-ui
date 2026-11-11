import { useCallback, useEffect, useRef, useState } from 'react'
import { useApi, useAuth } from '../api'
import { errorStatus } from '../api/errorMessage'
import { readProcessTryBuild } from '../api/processTryBuildApi'
import { processTryBuildDisplay, processTryBuildRefreshDelay } from '../utils/processTryBuildView'
import type { ProcessTryBuildDisplay, ProcessTryBuildView } from '../utils/processTryBuildViewTypes'
import { useOnWsReopen } from './useOnWsReopen'

export type UseProcessTryBuild = {
  /** The block to show; `undefined` while unread, not offered, or unknown to the backend. */
  display: ProcessTryBuildDisplay | undefined
  /** Read it again — for fresh links once they stopped working. Resolves to the block it read. */
  refresh: () => Promise<ProcessTryBuildDisplay | undefined>
}

/**
 * A run's "Try it on your phone" build, kept current as the build and the run change, its signed
 * links read again before they stop working.
 */
export function useProcessTryBuild(runId: string | undefined): UseProcessTryBuild {
  const { token } = useAuth()
  const { ws, apiBaseUrl } = useApi()
  const [build, setBuild] = useState<ProcessTryBuildView | undefined>(undefined)
  const currentRef = useRef<string | undefined>(runId)

  const refresh = useCallback(async (): Promise<ProcessTryBuildDisplay | undefined> => {
    if (!runId) return undefined
    try {
      const next = await readProcessTryBuild(runId)
      if (currentRef.current !== runId) return undefined
      setBuild(next)
      return processTryBuildDisplay(next, apiBaseUrl)
    } catch (err) {
      if (currentRef.current === runId && errorStatus(err) === 404) setBuild(undefined)
      return undefined
    }
  }, [runId, apiBaseUrl])

  useEffect(() => {
    currentRef.current = runId
    setBuild(undefined)
    return () => {
      currentRef.current = undefined
    }
  }, [runId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!runId) return
    const mine = (data: unknown) => (data as { runId?: string } | null)?.runId === runId
    const offBuild = ws.on('process:try-build-update', (data: unknown) => {
      if (mine(data)) void refresh()
    })
    const offRun = ws.on('process:run-update', (data: unknown) => {
      if (mine(data)) void refresh()
    })
    return () => {
      offBuild()
      offRun()
    }
  }, [ws, runId, refresh])

  useOnWsReopen(() => void refresh())

  useEffect(() => {
    const delay = processTryBuildRefreshDelay(build, Date.now())
    if (delay === undefined) return
    const timer = setTimeout(() => void refresh(), delay)
    return () => clearTimeout(timer)
  }, [build, refresh])

  return { display: processTryBuildDisplay(build, apiBaseUrl), refresh }
}
