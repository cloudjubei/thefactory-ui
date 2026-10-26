import { useCallback, useMemo, useState } from 'react'
import { runGroupStory } from '../api'
import type { GroupStoryRunBody } from '../utils/groupStoryTypes'

export interface UseGroupStoryRun {
  /** Run it; resolves with the group run started. Rejects with why it did not start. */
  run: (body: GroupStoryRunBody) => Promise<{ groupRunId: string; message: string }>
  running: boolean
}

/** Running one group story — reads nothing itself, so a list can run a row without loading the group twice. */
export function useGroupStoryRun(
  groupId: string | undefined,
  groupStoryId: string | undefined,
  onStarted?: () => Promise<void> | void,
): UseGroupStoryRun {
  const [running, setRunning] = useState(false)
  const run = useCallback(
    async (body: GroupStoryRunBody) => {
      if (!groupId || !groupStoryId) throw new Error('No group story selected.')
      setRunning(true)
      try {
        const { data } = await runGroupStory({
          path: { groupId, groupStoryId },
          body,
          throwOnError: true,
        })
        await onStarted?.()
        return data
      } finally {
        setRunning(false)
      }
    },
    [groupId, groupStoryId, onStarted],
  )
  return useMemo(() => ({ run, running }), [run, running])
}
