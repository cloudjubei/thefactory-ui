import { useMemo } from 'react'
import {
  queryProjectData,
  putProjectDataRecord,
  deleteProjectDataRecord,
  type ProjectDataPutInput,
  type ProjectDataQuery,
  type ProjectDataRef,
} from '../api/projectData'
import type { DataRecord } from '../api/generated'

export interface UseProjectData {
  query: (query?: ProjectDataQuery) => Promise<DataRecord[]>
  put: (input: ProjectDataPutInput) => Promise<DataRecord>
  remove: (ref: ProjectDataRef) => Promise<void>
}

/**
 * Imperative read/write access to a project's DataStorage records over the
 * backend SDK. Bound to `projectId`; methods reject when no project is active.
 */
export function useProjectData(projectId: string | undefined): UseProjectData {
  return useMemo<UseProjectData>(() => {
    const requireProject = (): string => {
      if (!projectId) throw new Error('useProjectData: no active project')
      return projectId
    }
    return {
      query: (query = {}) => queryProjectData(requireProject(), query),
      put: (input) => putProjectDataRecord(requireProject(), input),
      remove: (ref) => deleteProjectDataRecord(requireProject(), ref),
    }
  }, [projectId])
}
