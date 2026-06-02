import { useMemo } from 'react'
import { createProjectDataApi, type ProjectDataApi } from '../api/projectData'

export type UseProjectData = ProjectDataApi

/**
 * Imperative read/write access to a project's DataStorage records over the
 * backend SDK. Bound to `projectId`; see {@link createProjectDataApi} for the
 * no-active-project semantics.
 */
export function useProjectData(projectId: string | undefined): UseProjectData {
  return useMemo(() => createProjectDataApi(projectId), [projectId])
}
