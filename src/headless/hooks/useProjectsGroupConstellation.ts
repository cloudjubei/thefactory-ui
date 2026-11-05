import { useCallback, useEffect, useState } from 'react'
import { getProjectsGroupConstellation, useApi, useAuth } from '../api'
import type { ProjectsGroupConstellation } from '../utils/groupConstellationViewTypes'
import { isProjectsGroupStatusSignal } from './useProjectsGroupStatus'

export type UseProjectsGroupConstellation = {
  isLoaded: boolean
  loadError: Error | null
  constellation: ProjectsGroupConstellation | undefined
}

/**
 * A group's dependency map, read when the group is opened and again when its
 * members change. The route rebuilds nothing, so it is safe to read on a visit.
 */
export function useProjectsGroupConstellation(groupId: string): UseProjectsGroupConstellation {
  const { token } = useAuth()
  const { ws } = useApi()
  const [constellation, setConstellation] = useState<ProjectsGroupConstellation | undefined>(
    undefined,
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await getProjectsGroupConstellation({
        path: { id: groupId },
        throwOnError: true,
      })
      setConstellation(data)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [groupId])

  useEffect(() => {
    setConstellation(undefined)
    setIsLoaded(false)
    if (!token) return
    void refresh()
  }, [token, refresh])

  useEffect(() => {
    if (!token) return
    return ws.on('projects:updated', (data: unknown) => {
      if (isProjectsGroupStatusSignal(data, groupId)) void refresh()
    })
  }, [ws, token, groupId, refresh])

  return { isLoaded, loadError, constellation }
}
