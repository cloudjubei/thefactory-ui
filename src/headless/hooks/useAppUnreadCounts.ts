import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { APP_UNREAD_TYPE } from 'thefactory-tools/constants'
import { useApi } from '../api/ApiContext'
import { countProjectDataRecords } from '../api/projectData'
import { useProjects } from '../contexts/ProjectsContext'
import { appProjectIds, appUnreadChangeScope } from '../utils/appUnread'
import {
  appUnreadForProject,
  appUnreadSnapshot,
  setAppUnreadCount,
  subscribeAppUnread,
} from './appUnreadStore'

const counting = new Map<string, { again: boolean }>()

/** Count a project's unread app items again — once at a time, and once more for a change meanwhile. */
function recountAppUnread(projectId: string): void {
  const running = counting.get(projectId)
  if (running) {
    running.again = true
    return
  }
  const count = { again: false }
  counting.set(projectId, count)
  void countProjectDataRecords(projectId, { type: APP_UNREAD_TYPE })
    .then((n) => setAppUnreadCount(projectId, n))
    .catch(() => undefined)
    .finally(() => {
      counting.delete(projectId)
      if (count.again) recountAppUnread(projectId)
    })
}

/**
 * How many unread items a project's app holds — work it started that came into
 * the project, until the person opens what it made. Counted for every project
 * with an app, and again whenever one's items change.
 */
export function useAppUnreadCounts(): (projectId: string | undefined) => number {
  const { ws } = useApi()
  const { projects } = useProjects()
  const snapshot = useSyncExternalStore(subscribeAppUnread, appUnreadSnapshot)
  const appIds = useMemo(() => appProjectIds(projects).join('\n'), [projects])

  useEffect(() => {
    for (const id of appIds.split('\n').filter(Boolean)) recountAppUnread(id)
  }, [appIds])

  useEffect(
    () =>
      ws.on('data:updated', (payload) => {
        const scope = appUnreadChangeScope(payload)
        if (scope) recountAppUnread(scope)
      }),
    [ws],
  )

  return useCallback((projectId) => appUnreadForProject(snapshot, projectId), [snapshot])
}
