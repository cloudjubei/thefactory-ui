import { useCallback, useEffect, useState } from 'react'
import { listStoryGroupStories, useApi, useAuth } from '../api'
import type { GroupStoryMembership } from '../utils/groupStoryTypes'

/**
 * The group stories a project's story is a part of — what its header links
 * back to — kept current as group stories change. Empty for a story that is
 * no part, and while either id is missing.
 */
export function useStoryGroupStories(
  projectId: string | undefined,
  storyId: string | undefined,
): GroupStoryMembership[] {
  const { token } = useAuth()
  const { ws } = useApi()
  const [memberships, setMemberships] = useState<GroupStoryMembership[]>([])

  const refresh = useCallback(async () => {
    if (!projectId || !storyId) {
      setMemberships([])
      return
    }
    try {
      const { data } = await listStoryGroupStories({
        path: { projectId, storyId },
        throwOnError: true,
      })
      setMemberships(data)
    } catch {
      setMemberships([])
    }
  }, [projectId, storyId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    return ws.on('groupStories:updated', () => void refresh())
  }, [ws, token, refresh])

  return memberships
}
