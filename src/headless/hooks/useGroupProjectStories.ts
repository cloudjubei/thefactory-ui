import { useEffect, useMemo, useState } from 'react'
import { listStories, useAuth } from '../api'

/** A project's story as the group story form offers it. */
export interface GroupProjectStoryOption {
  id: string
  title: string
  status: string
}

/**
 * Each listed project's stories, for the group story form's story picker,
 * read once per project and newest first. A project whose stories cannot be
 * read offers none.
 */
export function useGroupProjectStories(
  projectIds: readonly string[],
): Record<string, GroupProjectStoryOption[]> {
  const { token } = useAuth()
  const [byProject, setByProject] = useState<Record<string, GroupProjectStoryOption[]>>({})
  const key = useMemo(() => [...projectIds].sort().join('\n'), [projectIds])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    for (const projectId of key ? key.split('\n') : []) {
      void listStories({ path: { projectId }, throwOnError: true })
        .then(({ data }) => {
          const stories = (Array.isArray(data) ? data : []) as Array<{
            id: string
            title: string
            status: string
            updatedAt?: string
          }>
          const options = [...stories]
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
            .map((s) => ({ id: s.id, title: s.title, status: s.status }))
          if (!cancelled) setByProject((prev) => ({ ...prev, [projectId]: options }))
        })
        .catch(() => {
          if (!cancelled) setByProject((prev) => ({ ...prev, [projectId]: [] }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [token, key])

  return byProject
}
