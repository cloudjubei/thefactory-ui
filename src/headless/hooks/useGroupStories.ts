import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createGroupStory,
  deleteGroupStory,
  listGroupStories,
  updateGroupStory,
  useApi,
  useAuth,
} from '../api'
import type { GroupStoryView, GroupStoryWriteBody } from '../utils/groupStoryTypes'

export interface UseGroupStories {
  stories: GroupStoryView[]
  isLoaded: boolean
  loadError: Error | null
  refresh: () => Promise<void>
  /** Make a group story; resolves with it as saved. Rejects with the reason the backend refused it. */
  createStory: (body: GroupStoryWriteBody) => Promise<GroupStoryView>
  updateStory: (groupStoryId: string, body: GroupStoryWriteBody) => Promise<GroupStoryView>
  /** Delete a group story; its part stories stay. */
  deleteStory: (groupStoryId: string) => Promise<void>
}

const WATCHED_EVENTS = ['groupStories:updated', 'stories:updated', 'process:group-run-update']

/**
 * A group's group stories, each with its parts read now, kept current: a
 * change to the group's stories, to any story (a part's status or blockers),
 * or to a group run refetches them. `groupId === undefined` idles.
 */
export function useGroupStories(groupId: string | undefined): UseGroupStories {
  const { token } = useAuth()
  const { ws } = useApi()
  const [stories, setStories] = useState<GroupStoryView[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!groupId) {
      setStories([])
      setIsLoaded(true)
      return
    }
    try {
      const { data } = await listGroupStories({ path: { groupId }, throwOnError: true })
      setStories(data)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [groupId])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token || !groupId) return
    const offs = WATCHED_EVENTS.map((event) =>
      ws.on(event, (data: unknown) => {
        if (
          event === 'groupStories:updated' &&
          (data as { groupId?: string })?.groupId !== groupId
        ) {
          return
        }
        void refresh()
      }),
    )
    return () => offs.forEach((off) => off())
  }, [ws, token, groupId, refresh])

  const requireGroup = useCallback((): string => {
    if (!groupId) throw new Error('No group selected.')
    return groupId
  }, [groupId])

  const createStory = useCallback(
    async (body: GroupStoryWriteBody) => {
      const { data } = await createGroupStory({
        path: { groupId: requireGroup() },
        body,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireGroup, refresh],
  )

  const updateStory = useCallback(
    async (groupStoryId: string, body: GroupStoryWriteBody) => {
      const { data } = await updateGroupStory({
        path: { groupId: requireGroup(), groupStoryId },
        body,
        throwOnError: true,
      })
      await refresh()
      return data
    },
    [requireGroup, refresh],
  )

  const deleteStory = useCallback(
    async (groupStoryId: string) => {
      await deleteGroupStory({
        path: { groupId: requireGroup(), groupStoryId },
        throwOnError: true,
      })
      await refresh()
    },
    [requireGroup, refresh],
  )

  return useMemo(
    () => ({ stories, isLoaded, loadError, refresh, createStory, updateStory, deleteStory }),
    [stories, isLoaded, loadError, refresh, createStory, updateStory, deleteStory],
  )
}
