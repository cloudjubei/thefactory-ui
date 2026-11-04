import { useEffect, useMemo, useState } from 'react'
import { previewProcessGroupRun, useAuth } from '../api'
import type {
  ProcessGroupLaunchPreview,
  ProcessGroupLegRequest,
} from '../utils/processGroupLaunchTypes'

export type UseProcessGroupLaunchPreview = {
  isLoaded: boolean
  loadError: Error | null
  preview: ProcessGroupLaunchPreview | undefined
}

/**
 * What a group launch would start — every leg with its project, story and
 * dependencies, the order the legs run in, and every reason it cannot start —
 * for the card read before approving `startGroupWork`. Fetched again only when
 * the legs asked for change.
 */
export function useProcessGroupLaunchPreview(input: {
  groupId: string | undefined
  legs: ProcessGroupLegRequest[]
  /** The group story the launch runs, so the preview says what happens to its ticket. */
  groupStoryId?: string | undefined
}): UseProcessGroupLaunchPreview {
  const { groupId, legs, groupStoryId } = input
  const { token } = useAuth()
  const key = JSON.stringify(legs)
  const [preview, setPreview] = useState<ProcessGroupLaunchPreview | undefined>(undefined)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    const requested = JSON.parse(key) as ProcessGroupLegRequest[]
    if (!token || !groupId || requested.length === 0) {
      setPreview(undefined)
      setIsLoaded(Boolean(token))
      return
    }
    let live = true
    setIsLoaded(false)
    setLoadError(null)
    const body = { groupId, legs: requested, ...(groupStoryId ? { groupStoryId } : {}) }
    void previewProcessGroupRun({ body, throwOnError: true })
      .then(({ data }) => {
        if (live) setPreview(data as ProcessGroupLaunchPreview)
      })
      .catch((err: unknown) => {
        if (live) setLoadError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (live) setIsLoaded(true)
      })
    return () => {
      live = false
    }
  }, [token, groupId, groupStoryId, key])

  return useMemo(() => ({ isLoaded, loadError, preview }), [isLoaded, loadError, preview])
}
