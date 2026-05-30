import { useEffect, useState } from 'react'

/** Tailwind's `md` breakpoint is 768px; match just below it. */
const NARROW_QUERY = '(max-width: 767.98px)'

/**
 * `true` while the viewport is narrower than Tailwind's `md` breakpoint —
 * the consumer's "mobile mode" on web. Drives sidebar drawers, master /
 * detail collapses, and other narrow-only layout switches. SSR-safe via
 * the `typeof window === 'undefined'` guards.
 */
export function useIsNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(NARROW_QUERY).matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(NARROW_QUERY)
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}
