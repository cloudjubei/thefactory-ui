import { useCallback, useRef, useState } from 'react'

import { extractErrorMessage, health } from '../api'
import { backendTestLine } from '../utils/backendConnection'
import { BACKEND_TEST_FAILED } from '../utils/backendConnectionConstants'
import type { BackendTestLine, BackendTestState } from '../utils/backendConnectionTypes'

export type UseBackendConnectionTest = {
  state: BackendTestState
  testing: boolean
  line: BackendTestLine | null
  /** Checks `/health` at `baseUrl` with `token`; a newer test overrides an older one. */
  test: (baseUrl: string, token: string | null) => Promise<void>
  reset: () => void
}

/** "Test connection" in the backend connection settings, the same on every client. */
export function useBackendConnectionTest(): UseBackendConnectionTest {
  const [state, setState] = useState<BackendTestState>({ kind: 'idle' })
  const epochRef = useRef(0)

  const test = useCallback(async (baseUrl: string, token: string | null) => {
    const epoch = ++epochRef.current
    setState({ kind: 'testing' })
    try {
      const res = await health({
        throwOnError: true,
        baseURL: baseUrl,
        auth: () => token ?? undefined,
      })
      if (epoch !== epochRef.current) return
      setState({
        kind: 'ok',
        version: String(res.data?.version ?? 'unknown'),
        uptime: Number(res.data?.uptime ?? 0),
      })
    } catch (err) {
      if (epoch !== epochRef.current) return
      setState({ kind: 'error', message: extractErrorMessage(err, BACKEND_TEST_FAILED) })
    }
  }, [])

  const reset = useCallback(() => {
    epochRef.current++
    setState({ kind: 'idle' })
  }, [])

  return { state, testing: state.kind === 'testing', line: backendTestLine(state), test, reset }
}
