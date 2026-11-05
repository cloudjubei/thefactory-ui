import { useEffect, useState } from 'react'
import type { ProcessRunStatistics } from 'thefactory-tools/types'

import { getProcessRunStatistics } from '../api'

const NONE: readonly ProcessRunStatistics[] = []

/**
 * How each process of a project has done over its ended runs. A failed read
 * shows nothing: the statistics are a help to choosing, never in the way of it.
 */
export function useProcessRunStatistics(
  projectId: string | undefined,
): readonly ProcessRunStatistics[] {
  const [held, setHeld] = useState<{ projectId: string; stats: readonly ProcessRunStatistics[] }>()

  useEffect(() => {
    if (!projectId) return
    let live = true
    getProcessRunStatistics({ query: { projectId }, throwOnError: true })
      .then(({ data }) => {
        if (live) setHeld({ projectId, stats: data as ProcessRunStatistics[] })
      })
      .catch(() => {
        if (live) setHeld({ projectId, stats: NONE })
      })
    return () => {
      live = false
    }
  }, [projectId])

  return held && held.projectId === projectId ? held.stats : NONE
}
