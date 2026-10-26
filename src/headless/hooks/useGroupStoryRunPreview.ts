import { useCallback, useEffect, useState } from 'react'

import { extractErrorMessage, previewGroupStoryRun } from '../api'
import type { GroupStoryRunPreview } from '../utils/groupStoryTypes'

export interface UseGroupStoryRunPreview {
  preview: GroupStoryRunPreview | undefined
  loading: boolean
  error: string | undefined
  /** Each part's branch the person picked, by project id. */
  basePicks: Record<string, string>
  /** Pick a part's branch; the preview is read again with it. */
  pickBase: (projectId: string, branch: string) => void
}

/**
 * What running a group story would start, read while its Run dialog is open
 * and again on every branch the person picks. Closing it forgets the picks.
 */
export function useGroupStoryRunPreview(
  groupId: string | undefined,
  groupStoryId: string | undefined,
  open: boolean,
): UseGroupStoryRunPreview {
  const [preview, setPreview] = useState<GroupStoryRunPreview>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [basePicks, setBasePicks] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setPreview(undefined)
      setError(undefined)
      setBasePicks({})
    }
  }, [open])

  useEffect(() => {
    if (!open || !groupId || !groupStoryId) return
    let live = true
    setLoading(true)
    void previewGroupStoryRun({
      path: { groupId, groupStoryId },
      body: Object.keys(basePicks).length > 0 ? { baseBranches: basePicks } : {},
      throwOnError: true,
    })
      .then(({ data }) => {
        if (!live) return
        setPreview(data)
        setError(undefined)
      })
      .catch((err: unknown) => {
        if (live) setError(extractErrorMessage(err, 'The run could not be previewed.'))
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [open, groupId, groupStoryId, basePicks])

  const pickBase = useCallback((projectId: string, branch: string) => {
    setBasePicks((prev) => ({ ...prev, [projectId]: branch }))
  }, [])

  return { preview, loading, error, basePicks, pickBase }
}
