import { useCallback, useState } from 'react'

import { GROUP_STORY_FOLDS_DEFAULT } from '../utils/groupStoryConstants'
import type { GroupStoryFoldControls, GroupStoryFolds } from '../utils/groupStoryTypes'
import { groupStoryToggledFold } from '../utils/groupStoryView'

const KEPT = new Map<string, GroupStoryFolds>()

/**
 * What is open on a group story's page, kept per group story for the session:
 * leaving it and coming back finds it as it was left. `initial` seeds a group
 * story seen for the first time.
 */
export function useGroupStoryFolds(
  groupStoryId: string,
  initial?: Partial<GroupStoryFolds>,
): GroupStoryFoldControls {
  const [folds, setFolds] = useState<GroupStoryFolds>(
    () => KEPT.get(groupStoryId) ?? { ...GROUP_STORY_FOLDS_DEFAULT, ...initial },
  )
  const change = useCallback(
    (next: (prev: GroupStoryFolds) => GroupStoryFolds) => {
      setFolds((prev) => {
        const changed = next(prev)
        KEPT.set(groupStoryId, changed)
        return changed
      })
    },
    [groupStoryId],
  )
  return {
    folds,
    toggleParts: useCallback(() => change((f) => ({ ...f, parts: !f.parts })), [change]),
    toggleOverview: useCallback(() => change((f) => ({ ...f, overview: !f.overview })), [change]),
    toggleSection: useCallback(
      (key: string) => change((f) => groupStoryToggledFold(f, key)),
      [change],
    ),
    setSections: useCallback(
      (keys: readonly string[]) => change((f) => ({ ...f, sections: [...keys] })),
      [change],
    ),
  }
}
