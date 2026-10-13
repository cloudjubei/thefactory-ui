import { useEffect } from 'react'

import { prefetchProjectStories } from '../contexts/StoriesContext'
import { prefetchInTurn } from '../utils/prefetchInTurn'
import { PROJECT_PREFETCH_LIMIT } from '../utils/projectResourceCacheConstants'

/**
 * While `active`, read ahead the stories of the first few of `projectIds` — the
 * projects a person is likely to open next, in the order they see them — one at
 * a time, so opening one paints at once. For a surface with no hover to go by,
 * like a phone's opened drawer; reading stops when it closes.
 */
export function usePrefetchProjectStories(active: boolean, projectIds: readonly string[]): void {
  const key = projectIds.join('\n')
  useEffect(() => {
    if (!active || !key) return
    return prefetchInTurn(key.split('\n'), prefetchProjectStories, PROJECT_PREFETCH_LIMIT)
  }, [active, key])
}
