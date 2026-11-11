import { useMemo } from 'react'

import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { processLibraryGroup } from '../utils/processView'

/**
 * The group a project's process library reads from — its main group, by id
 * and name — or `undefined` when the project is in none.
 */
export function useProcessLibraryGroup(
  projectId: string | undefined,
): { id: string; name: string | undefined } | undefined {
  const { projects } = useProjects()
  const { groups } = useProjectsGroups()
  const project = projectId ? projects.find((one) => one.id === projectId) : undefined
  return useMemo(() => processLibraryGroup(project, groups), [project, groups])
}
