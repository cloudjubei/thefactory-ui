import { useEffect, useState } from 'react'
import { useAuth } from '../api/AuthContext'
import { computeRefreshDelayMs } from '../utils/viewTokenSchedule'
import { designViewTokenFor } from './designStore'

const LEAD_MS = 60_000
const RETRY_MS = 30_000

/**
 * A project's view token for `<img>`, `<video>` and `<iframe>` sources of its
 * design, minted once for every surface and again before it runs out.
 * `undefined` until minted, or while `projectId` is `undefined`.
 */
export function useDesignViewToken(projectId: string | undefined): {
  token: string | undefined
  error: Error | null
} {
  const { token: bearer } = useAuth()
  const [state, setState] = useState<{
    projectId: string | undefined
    token: string | undefined
    error: Error | null
  }>({ projectId, token: undefined, error: null })

  useEffect(() => {
    if (!projectId || !bearer) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const mint = async () => {
      try {
        const minted = await designViewTokenFor(projectId)
        if (!alive) return
        setState({ projectId, token: minted.token, error: null })
        const delay = computeRefreshDelayMs({ expiresAt: minted.expiresAt, leadMs: LEAD_MS })
        timer = setTimeout(() => void mint(), Math.max(delay ?? RETRY_MS, 1_000))
      } catch (err) {
        if (!alive) return
        setState((prev) => ({
          projectId,
          token: prev.projectId === projectId ? prev.token : undefined,
          error: err instanceof Error ? err : new Error(String(err)),
        }))
        timer = setTimeout(() => void mint(), RETRY_MS)
      }
    }
    void mint()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [projectId, bearer])

  return state.projectId === projectId
    ? { token: state.token, error: state.error }
    : { token: undefined, error: null }
}
