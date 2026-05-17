import { useEffect, useState } from 'react'

/**
 * Returns a re-rendering "now" timestamp that ticks every `intervalMs` while
 * `active` is true. Cheap clock for live duration labels (e.g. an in-flight
 * agent run's elapsed time).
 *
 * When `active` is false, the clock pauses at the last sampled value — so
 * components that bind to it stop re-rendering once the work finishes.
 */
export function useDurationTimer(active: boolean, intervalMs: number = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])

  return now
}
