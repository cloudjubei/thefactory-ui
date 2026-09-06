import { useCallback, useEffect, useRef, useState } from 'react'

import {
  getReviewEvidenceContent,
  listReviewEvidence,
  type ReviewEvidenceRef,
} from '../api/generated'
import { isViewableImage, toEvidenceTile, type EvidenceTile } from '../utils/reviewEvidenceView'

/**
 * How many images are decoded into memory at once.
 *
 * Each becomes a base64 data URI roughly 4/3 the size of the file, held for as
 * long as the panel is mounted. A run that captured thirty screens would
 * otherwise put tens of megabytes of strings on the heap to render a strip most
 * of which is off screen.
 */
const MAX_INLINE_IMAGES = 12

/** Turn a fetched body into a data URI usable by both `<img>` and RN `<Image>`. */
function toDataUri(data: unknown, mediaType: string): string | undefined {
  if (typeof data === 'string') {
    // Already a data URI (some transports hand one back); otherwise treat as raw base64.
    return data.startsWith('data:') ? data : `data:${mediaType};base64,${data}`
  }
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer as ArrayBuffer)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return `data:${mediaType};base64,${btoa(binary)}`
  }
  return undefined
}

export type UseReviewEvidence = {
  /** Everything recorded for the query, newest first. */
  refs: ReviewEvidenceRef[]
  /** Renderable tiles, images resolved up to {@link MAX_INLINE_IMAGES}. */
  tiles: EvidenceTile[]
  loading: boolean
  error: string | undefined
  /** Number of images not decoded because of the cap. */
  notShown: number
  reload: () => Promise<void>
}

/**
 * The proof a run produced, ready to put on screen.
 *
 * Images are fetched through the API client rather than linked directly: the
 * backend is bearer-authenticated, so an `<img src>` pointing at the content
 * endpoint would simply 401. Data URIs also work unchanged on React Native,
 * where object URLs do not.
 */
export function useReviewEvidence(
  projectId: string | undefined,
  query: { runId?: string; storyId?: string; featureId?: string },
): UseReviewEvidence {
  const [refs, setRefs] = useState<ReviewEvidenceRef[]>([])
  const [tiles, setTiles] = useState<EvidenceTile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [notShown, setNotShown] = useState(0)
  const epochRef = useRef(0)

  const { runId, storyId, featureId } = query

  const reload = useCallback(async () => {
    if (!projectId || (!runId && !storyId && !featureId)) {
      setRefs([])
      setTiles([])
      return
    }
    const epoch = ++epochRef.current
    setLoading(true)
    setError(undefined)
    try {
      const { data } = await listReviewEvidence({
        path: { projectId },
        query: {
          ...(runId ? { runId } : {}),
          ...(storyId ? { storyId } : {}),
          ...(featureId ? { featureId } : {}),
        },
        throwOnError: true,
      })
      if (epoch !== epochRef.current) return
      const found = data ?? []
      setRefs(found)
      const baseTiles = found.map(toEvidenceTile)
      setTiles(baseTiles)

      const images = found.filter(isViewableImage)
      setNotShown(Math.max(0, images.length - MAX_INLINE_IMAGES))
      for (const image of images.slice(0, MAX_INLINE_IMAGES)) {
        try {
          const res = await getReviewEvidenceContent({
            path: { projectId, evidenceId: image.id },
            responseType: 'arraybuffer',
            throwOnError: true,
          } as never)
          if (epoch !== epochRef.current) return
          const dataUri = toDataUri((res as { data?: unknown }).data, image.mediaType)
          if (!dataUri) continue
          // Resolve one at a time so the first screenshot appears immediately
          // rather than the strip staying blank until the last byte arrives.
          setTiles((prev) => prev.map((t) => (t.ref.id === image.id ? { ...t, dataUri } : t)))
        } catch {
          // One unreadable file must not blank the whole gallery.
        }
      }
    } catch (err: unknown) {
      if (epoch === epochRef.current) setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (epoch === epochRef.current) setLoading(false)
    }
  }, [projectId, runId, storyId, featureId])

  useEffect(() => {
    void reload()
    return () => {
      // Invalidate in-flight loads so a late response cannot write decoded
      // images into an unmounted panel's state.
      epochRef.current += 1
    }
  }, [reload])

  return { refs, tiles, loading, error, notShown, reload }
}
