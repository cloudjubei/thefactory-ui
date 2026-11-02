import { useCallback, useState } from 'react'

import { GROUP_STORY_LIST_FILTER_DEFAULT } from '../utils/groupStoryConstants'
import type { GroupStoryListFilter } from '../utils/groupStoryTypes'

const KEPT = new Map<string, GroupStoryListFilter>()

/**
 * A group's Stories tab filter, kept per group for the session: opening a
 * group story and coming back finds the tab as it was left. `initial` seeds a
 * group seen for the first time.
 */
export function useGroupStoryListFilter(
  groupId: string,
  initial?: Partial<GroupStoryListFilter>,
): [GroupStoryListFilter, (change: Partial<GroupStoryListFilter>) => void] {
  const [filter, setFilter] = useState<GroupStoryListFilter>(
    () => KEPT.get(groupId) ?? { ...GROUP_STORY_LIST_FILTER_DEFAULT, ...initial },
  )
  const change = useCallback(
    (next: Partial<GroupStoryListFilter>) => {
      setFilter((prev) => {
        const merged = { ...prev, ...next }
        KEPT.set(groupId, merged)
        return merged
      })
    },
    [groupId],
  )
  return [filter, change]
}
