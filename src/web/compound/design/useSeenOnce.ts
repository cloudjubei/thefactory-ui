import { useCallback, useState } from 'react'
import { DESIGN_THUMB_LOAD_AHEAD } from './designWebConstants'

const waiting = new Map<Element, () => void>()
let observer: IntersectionObserver | undefined

function watch(element: Element, onSeen: () => void): () => void {
  observer ??= new IntersectionObserver((seen) => {
    for (const { isIntersecting, target } of seen) {
      if (!isIntersecting) continue
      waiting.get(target)?.()
      waiting.delete(target)
      observer?.unobserve(target)
    }
  }, DESIGN_THUMB_LOAD_AHEAD)
  waiting.set(element, onSeen)
  observer.observe(element)
  return () => {
    waiting.delete(element)
    observer?.unobserve(element)
  }
}

/**
 * Whether an element has come near the screen yet, staying `true` once it has.
 * A long list shares one observer: a proposal can hold over a thousand images.
 */
export function useSeenOnce<T extends Element>(): {
  ref: (element: T | null) => void
  seen: boolean
} {
  const [seen, setSeen] = useState(false)
  const ref = useCallback((element: T | null) => {
    if (!element) return
    return watch(element, () => setSeen(true))
  }, [])
  return { ref, seen }
}
