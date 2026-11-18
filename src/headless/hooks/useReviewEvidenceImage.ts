import { useEffect, useRef, useState } from 'react'

import { getReviewEvidenceContent } from '../api'

/** Base64 data URI for an evidence image, once its bytes have loaded. */
export type UseReviewEvidenceImage = {
  dataUri: string | undefined
  loading: boolean
  error: string | undefined
}

function toDataUri(data: unknown, mediaType: string): string | undefined {
  if (typeof data === 'string') return `data:${mediaType};base64,${btoa(data)}`
  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return `data:${mediaType};base64,${btoa(binary)}`
  }
  return undefined
}

/**
 * Load ONE filed evidence image by id — the tool-call preview for
 * `recordReviewEvidence` shows the shot the agent just filed, rather than only
 * naming it. Separate from `useReviewEvidence` (which loads a whole run's
 * gallery) because a tool row knows its single id and nothing else.
 */
export function useReviewEvidenceImage(
  projectId: string | undefined,
  evidenceId: string | undefined,
  mediaType = 'image/png',
): UseReviewEvidenceImage {
  const [dataUri, setDataUri] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const epochRef = useRef(0)

  useEffect(() => {
    const epoch = ++epochRef.current
    setDataUri(undefined)
    setError(undefined)
    setLoading(false)
    if (!projectId || !evidenceId) return
    setLoading(true)
    void (async () => {
      try {
        const res = await getReviewEvidenceContent({
          path: { projectId, evidenceId },
          responseType: 'arraybuffer',
          throwOnError: true,
        } as never)
        if (epoch !== epochRef.current) return
        const uri = toDataUri((res as { data?: unknown }).data, mediaType)
        if (!uri) throw new Error('Unreadable evidence content')
        setDataUri(uri)
      } catch {
        if (epoch === epochRef.current) setError('Evidence content could not be loaded.')
      } finally {
        if (epoch === epochRef.current) setLoading(false)
      }
    })()
  }, [projectId, evidenceId, mediaType])

  return { dataUri, loading, error }
}
