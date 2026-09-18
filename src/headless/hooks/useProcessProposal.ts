import { useEffect, useMemo, useState } from 'react'
import type { ProcessProposal } from 'thefactory-tools/types'
import { previewProcess } from '../api'
import { useAuth } from '../api'

export type UseProcessProposal = {
  isLoaded: boolean
  loadError: Error | null
  proposal: ProcessProposal | undefined
}

/**
 * The launch PROPOSAL for a story — the resolved plan a user reads before
 * approving `startFeatureWork`. Fetched once per (project, story, process),
 * because a definition does not change under a pending approval; the dock reads
 * it to show the whole path the run will take, not just the feature list.
 *
 * A story with no id, or a failed fetch, yields no proposal and the dock falls
 * back to what it already knows (the feature list) rather than blocking.
 */
export function useProcessProposal(input: {
  projectId: string | undefined
  storyId: string | undefined
  processId?: string
}): UseProcessProposal {
  const { projectId, storyId, processId } = input
  const { token } = useAuth()
  const [proposal, setProposal] = useState<ProcessProposal | undefined>(undefined)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    if (!token || !projectId || !storyId) {
      setProposal(undefined)
      setIsLoaded(Boolean(token) && (!projectId || !storyId))
      return
    }
    let live = true
    setIsLoaded(false)
    setLoadError(null)
    void previewProcess({
      body: { projectId, storyId, ...(processId ? { processId } : {}) },
      throwOnError: true,
    })
      .then(({ data }) => {
        if (!live) return
        setProposal(data as ProcessProposal)
      })
      .catch((err: unknown) => {
        if (!live) return
        setLoadError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (live) setIsLoaded(true)
      })
    return () => {
      live = false
    }
  }, [token, projectId, storyId, processId])

  return useMemo<UseProcessProposal>(
    () => ({ isLoaded, loadError, proposal }),
    [isLoaded, loadError, proposal],
  )
}
