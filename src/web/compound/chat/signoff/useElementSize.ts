import { useEffect, useState } from 'react'

import type { PairViewerSize } from '../../../../headless'

/**
 * The live content-box size of `el`, tracked with a ResizeObserver. Takes the
 * element itself (from a callback ref) because the overlay mounts its body a
 * frame after opening, when a ref object would still be empty.
 */
export function useElementSize(el: HTMLElement | null): PairViewerSize | undefined {
  const [size, setSize] = useState<PairViewerSize | undefined>()
  useEffect(() => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize((prev) =>
        prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])
  return size
}
