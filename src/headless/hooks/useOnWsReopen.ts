import { useEffect, useRef } from 'react'
import { useApi } from '../api'
import { isWsReopen } from '../utils/wsReconnect'

/**
 * Call `onReopen` each time the socket comes back after dropping — the moment to
 * fetch again whatever broadcasts keep current, since those sent while it was
 * down are lost.
 */
export function useOnWsReopen(onReopen: () => void): void {
  const { wsState } = useApi()
  const prevRef = useRef(wsState)
  const latestRef = useRef(onReopen)
  latestRef.current = onReopen
  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = wsState
    if (isWsReopen(prev, wsState)) latestRef.current()
  }, [wsState])
}
