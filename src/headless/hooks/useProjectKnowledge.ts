import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { extractErrorMessage, getProjectKnowledgeOverview } from '../api'
import { useAuth } from '../api/AuthContext'
import { LiveResourceStore } from '../utils/liveResourceStore'
import { KNOWLEDGE_OVERVIEW_LINGER_MS, KNOWLEDGE_TEXT } from '../utils/knowledgeOverviewConstants'
import { knowledgeView } from '../utils/knowledgeOverviewView'
import type { KnowledgeView, ProjectKnowledgeOverview } from '../utils/knowledgeOverviewTypes'

/** Read what a project's Knowledge tab shows from its own route. */
export async function readProjectKnowledgeOverview(
  projectId: string,
): Promise<ProjectKnowledgeOverview> {
  const { data } = await getProjectKnowledgeOverview({ path: { projectId }, throwOnError: true })
  return data
}

const lastRead = new Map<string, ProjectKnowledgeOverview>()

const overviews = new LiveResourceStore<ProjectKnowledgeOverview>({
  load: readProjectKnowledgeOverview,
  lingerMs: KNOWLEDGE_OVERVIEW_LINGER_MS,
  recall: (projectId) => lastRead.get(projectId),
  remember: (projectId, overview) => lastRead.set(projectId, overview),
})

export type UseProjectKnowledge = {
  /** Everything the tab draws, the same on every client. */
  view: KnowledgeView
  /** Read the overview again — on opening the tab, or when the app comes back into view. */
  refresh: () => Promise<void>
}

/**
 * A project's Knowledge tab: its stored overview — what the map upkeep last wrote into the checkout — or why there
 * is none yet. Read every time the tab opens and again on `refresh`; what an earlier visit read is shown meanwhile.
 * Pass `projectId === undefined` to idle.
 */
export function useProjectKnowledge(projectId: string | undefined): UseProjectKnowledge {
  const { token } = useAuth()
  const key = projectId ?? ''

  useEffect(() => {
    if (!token || !projectId) return
    return overviews.retain(projectId)
  }, [projectId, token])

  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => overviews.listen(key, listener), [key]),
    () => overviews.snapshot(key),
    () => overviews.snapshot(key),
  )
  const refresh = useCallback(
    () => (projectId ? overviews.refresh(projectId) : Promise.resolve()),
    [projectId],
  )
  const view = useMemo(
    () =>
      knowledgeView({
        data: snapshot.data,
        loaded: snapshot.settled,
        error: snapshot.error
          ? extractErrorMessage(snapshot.error, KNOWLEDGE_TEXT.errorFallback)
          : null,
      }),
    [snapshot],
  )
  return { view, refresh }
}
