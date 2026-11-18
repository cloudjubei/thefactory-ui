import { useEffect, useState } from 'react'
import { useOptionalApi } from '../api/ApiContext'
import { readReviewEvidenceMediaUrl } from '../api/reviewEvidenceMediaApi'

export type UseReviewEvidenceMediaUrl = {
  url: string | undefined
  loading: boolean
  error: boolean
}

/**
 * A streaming/download URL, never the media bytes. Grants rotate before expiry;
 * cleanup fences late responses and timers when the evidence or server changes.
 */
export function useReviewEvidenceMediaUrl(
  projectId: string | undefined,
  evidenceId: string | undefined,
): UseReviewEvidenceMediaUrl {
  const apiBaseUrl = useOptionalApi()?.apiBaseUrl
  const key = `${apiBaseUrl}\n${projectId}\n${evidenceId}`
  const [state, setState] = useState<UseReviewEvidenceMediaUrl & { key: string }>({
    key,
    url: undefined,
    loading: false,
    error: false,
  })

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    setState({ key, url: undefined, loading: Boolean(projectId && evidenceId), error: false })
    if (!projectId || !evidenceId) return
    const mint = async () => {
      try {
        const grant = await readReviewEvidenceMediaUrl(projectId, evidenceId)
        if (!active) return
        const url = grant.url.startsWith('/')
          ? `${(apiBaseUrl ?? '').replace(/\/+$/, '')}${grant.url}`
          : grant.url
        setState({ key, url, loading: false, error: false })
        const remaining = Date.parse(grant.expiresAt) - Date.now()
        if (Number.isFinite(remaining)) {
          timer = setTimeout(
            () => void mint(),
            Math.min(2_147_483_647, Math.max(1000, remaining - 30_000)),
          )
        }
      } catch {
        if (!active) return
        setState({ key, url: undefined, loading: false, error: true })
        timer = setTimeout(() => void mint(), 30_000)
      }
    }
    void mint()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [apiBaseUrl, projectId, evidenceId, key])

  return state.key === key ? state : { url: undefined, loading: true, error: false }
}
