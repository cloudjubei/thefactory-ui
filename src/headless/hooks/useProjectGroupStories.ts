import { useCallback, useEffect, useState } from 'react'
import { listProjectGroupStories, useApi, useAuth } from '../api'
import type { GroupStoryMembershipsByStory } from '../utils/groupStoryTypes'

/**
 * The group stories each of a project's stories is a part of, by story id —
 * what a story list's rows show, in one read — kept current as group stories
 * change. Empty while the project id is missing.
 */
export function useProjectGroupStories(
  projectId: string | undefined,
): GroupStoryMembershipsByStory {
  const { token } = useAuth()
  const { ws } = useApi()
  const [byStory, setByStory] = useState<GroupStoryMembershipsByStory>({})

  const refresh = useCallback(async () => {
    if (!projectId) {
      setByStory({})
      return
    }
    try {
      const { data } = await listProjectGroupStories({ path: { projectId }, throwOnError: true })
      setByStory(data)
    } catch {
      setByStory({})
    }
  }, [projectId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    return ws.on('groupStories:updated', () => void refresh())
  }, [ws, token, refresh])

  return byStory
}
