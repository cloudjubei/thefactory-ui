import { useEffect, useRef, useState } from 'react'

/**
 * Mirrors `liveKeys` into a displayed set, with debounced removals.
 *
 * Additions are reflected immediately; removals are delayed by `debounceMs`
 * so a key briefly leaving the live set doesn't cause a flicker. Used by the
 * chat-thinking indicator across the overseer apps — a chat that finishes a
 * stream and immediately starts another shouldn't visibly drop the spinner.
 *
 * Headless / no DOM: uses `setTimeout` / `clearTimeout`, so this works in
 * any environment that provides them (web, RN, Node).
 */
export function useDebouncedSetExit<T>(liveKeys: ReadonlySet<T>, debounceMs = 500): ReadonlySet<T> {
  const [displayKeys, setDisplayKeys] = useState<Set<T>>(new Set())
  const timersRef = useRef<Map<T, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    setDisplayKeys((prev) => {
      const next = new Set(prev)
      for (const k of liveKeys) {
        next.add(k)
        const t = timersRef.current.get(k)
        if (t) {
          clearTimeout(t)
          timersRef.current.delete(k)
        }
      }
      for (const k of prev) {
        if (!liveKeys.has(k) && !timersRef.current.has(k)) {
          const timeout = setTimeout(() => {
            setDisplayKeys((cur) => {
              const nn = new Set(cur)
              nn.delete(k)
              return nn
            })
            timersRef.current.delete(k)
          }, debounceMs)
          timersRef.current.set(k, timeout)
        }
      }
      return next
    })
  }, [liveKeys, debounceMs])

  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t)
      timersRef.current.clear()
    }
  }, [])

  return displayKeys
}
