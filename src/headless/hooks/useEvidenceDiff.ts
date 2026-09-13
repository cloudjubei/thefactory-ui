import { useEffect, useRef, useState } from 'react'

import { getReviewEvidenceDiff } from '../api'

/** The pixel comparison of one before/after pair, once it has been computed. */
export type UseEvidenceDiff = {
  /** Base64 data URI of the rendered comparison, or undefined until it loads. */
  dataUri: string | undefined
  loading: boolean
  /**
   * Why there is no comparison, in words the reviewer can act on: an unreadable
   * capture, no overlapping area, a size past the allocation ceiling. A blank
   * pane with no reason is the failure this whole surface exists to avoid.
   */
  error: string | undefined
}

function toDataUri(data: unknown): string | undefined {
  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return `data:image/png;base64,${btoa(binary)}`
  }
  return undefined
}

/**
 * The pixel comparison of a before/after screenshot pair.
 *
 * Computed by the host on demand, never filed: it is derived from two immutable
 * artefacts, so it caches perfectly and storing it would mean a third file to
 * keep in step with the two it comes from.
 *
 * Lazy on purpose — only fetched once the reviewer actually asks for the Diff
 * view. A gallery of a dozen pairs would otherwise compute a dozen comparisons
 * nobody looked at, each of them decoding two full-resolution PNGs.
 */
export function useEvidenceDiff(
  projectId: string | undefined,
  beforeId: string | undefined,
  afterId: string | undefined,
  enabled: boolean,
): UseEvidenceDiff {
  const [dataUri, setDataUri] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const epochRef = useRef(0)

  useEffect(() => {
    const epoch = ++epochRef.current
    setDataUri(undefined)
    setError(undefined)
    if (!enabled || !projectId || !beforeId || !afterId) return
    setLoading(true)
    void (async () => {
      try {
        const res = await getReviewEvidenceDiff({
          path: { projectId },
          query: { before: beforeId, after: afterId },
          responseType: 'arraybuffer',
          throwOnError: true,
        } as never)
        if (epoch !== epochRef.current) return
        const uri = toDataUri((res as { data?: unknown }).data)
        if (uri) setDataUri(uri)
        else setError('The comparison came back in a form this view cannot show.')
      } catch (err: unknown) {
        if (epoch !== epochRef.current) return
        // The host refuses with a sentence; surface it rather than "failed".
        const body = (err as { error?: { error?: string }; message?: string } | undefined) ?? {}
        setError(body.error?.error ?? body.message ?? 'The comparison could not be computed.')
      } finally {
        if (epoch === epochRef.current) setLoading(false)
      }
    })()
  }, [projectId, beforeId, afterId, enabled])

  return { dataUri, loading, error }
}
