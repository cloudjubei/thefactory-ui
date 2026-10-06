import { useEffect, useState } from 'react'

import type { PairViewerSize } from '../../../../headless'

/** The decoded pixel size of `src`, or `undefined` until it has loaded. */
export function useImageNaturalSize(src: string | undefined): PairViewerSize | undefined {
  const [loaded, setLoaded] = useState<{ src: string; size: PairViewerSize } | undefined>()
  useEffect(() => {
    if (!src) return
    let live = true
    const img = new Image()
    img.onload = () => {
      if (live && img.naturalWidth > 0 && img.naturalHeight > 0) {
        setLoaded({ src, size: { w: img.naturalWidth, h: img.naturalHeight } })
      }
    }
    img.src = src
    return () => {
      live = false
      img.onload = null
    }
  }, [src])
  return loaded && loaded.src === src ? loaded.size : undefined
}
