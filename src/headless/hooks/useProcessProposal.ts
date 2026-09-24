import { useEffect, useMemo, useState } from 'react'
import type { ProcessProposal } from 'thefactory-tools/types'
import { previewProcess } from '../api'
import { useAuth } from '../api'
import { launchRefusalMessage } from '../utils/approvalGrant'

export type UseProcessProposal = {
  isLoaded: boolean
  loadError: Error | null
  proposal: ProcessProposal | undefined
  /** Why the launch would be refused, in the server's words — the dock must not offer it. */
  refusal: string | undefined
}

/**
 * The launch PROPOSAL for a story — the resolved plan a user reads before
 * approving `startFeatureWork`. Fetched once per (project, story, process),
 * because a definition does not change under a pending approval; the dock reads
 * it to show the whole path the run will take, not just the feature list.
 *
 * A story with no id, or a failed fetch, yields no proposal and the dock falls
 * back to what it already knows (the feature list) rather than blocking — unless
 * the server REFUSED it, whose reason is the launch's own and is surfaced.
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
  const [refusal, setRefusal] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!token || !projectId || !storyId) {
      setProposal(undefined)
      setRefusal(undefined)
      setIsLoaded(Boolean(token) && (!projectId || !storyId))
      return
    }
    let live = true
    setIsLoaded(false)
    setLoadError(null)
    setRefusal(undefined)
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
        setRefusal(launchRefusalMessage(err))
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
    () => ({ isLoaded, loadError, proposal, refusal }),
    [isLoaded, loadError, proposal, refusal],
  )
}
