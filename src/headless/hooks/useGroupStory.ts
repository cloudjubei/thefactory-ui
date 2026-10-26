import { useCallback, useMemo } from 'react'
import { previewGroupStoryRun } from '../api'
import type {
  GroupStoryRunBody,
  GroupStoryRunPreview,
  GroupStoryView,
} from '../utils/groupStoryTypes'
import { useGroupStories, type UseGroupStories } from './useGroupStories'
import { useGroupStoryRun } from './useGroupStoryRun'

export interface UseGroupStory extends Omit<UseGroupStories, 'stories'> {
  /** `undefined` while loading, or when the group has no such story. */
  story: GroupStoryView | undefined
  /** What running it would start, on the branches asked for. */
  previewRun: (baseBranches?: Record<string, string>) => Promise<GroupStoryRunPreview>
  /** Run it; resolves with the group run started. Rejects with why it did not start. */
  run: (body: GroupStoryRunBody) => Promise<{ groupRunId: string; message: string }>
  running: boolean
}

/** One group story of a group, kept current, with its run. */
export function useGroupStory(
  groupId: string | undefined,
  groupStoryId: string | undefined,
): UseGroupStory {
  const { stories, ...rest } = useGroupStories(groupId)
  const story = stories.find((s) => s.id === groupStoryId)

  const previewRun = useCallback(
    async (baseBranches?: Record<string, string>) => {
      if (!groupId || !groupStoryId) throw new Error('No group story selected.')
      const { data } = await previewGroupStoryRun({
        path: { groupId, groupStoryId },
        body: baseBranches ? { baseBranches } : {},
        throwOnError: true,
      })
      return data
    },
    [groupId, groupStoryId],
  )

  const { run, running } = useGroupStoryRun(groupId, groupStoryId, rest.refresh)

  return useMemo(
    () => ({ ...rest, story, previewRun, run, running }),
    [rest, story, previewRun, run, running],
  )
}
