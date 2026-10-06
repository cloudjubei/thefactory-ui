import { useEffect, useState } from 'react'
import { Image } from 'react-native'

import type { PairViewerSize } from '../../../../headless'

/** The decoded pixel size of `uri`, or `undefined` until it has loaded. */
export function useImageNaturalSize(uri: string | undefined): PairViewerSize | undefined {
  const [loaded, setLoaded] = useState<{ uri: string; size: PairViewerSize } | undefined>()
  useEffect(() => {
    if (!uri) return
    let live = true
    Image.getSize(
      uri,
      (w, h) => {
        if (live && w > 0 && h > 0) setLoaded({ uri, size: { w, h } })
      },
      () => {},
    )
    return () => {
      live = false
    }
  }, [uri])
  return loaded && loaded.uri === uri ? loaded.size : undefined
}
