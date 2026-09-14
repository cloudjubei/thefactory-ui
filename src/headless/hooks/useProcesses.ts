import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProcessDefinition, ProcessStepKind } from 'thefactory-tools/types'
import {
  deleteProcess,
  getProcessCapabilities,
  listProcesses,
  saveProcess,
  validateProcess,
} from '../api'
import { useAuth } from '../api/AuthContext'

export type UseProcesses = {
  isLoaded: boolean
  loadError: Error | null
  /** Both scopes resolved: the shared library plus this project's own, by name. */
  processes: ProcessDefinition[]
  /** Every kind the model knows — the editor greys out the ones it cannot use. */
  kinds: ProcessStepKind[]
  /** The subset this build can execute. A definition naming anything else is refused. */
  implementedKinds: ProcessStepKind[]
  refresh: () => Promise<void>
  /**
   * Write a definition. Inside a project this always writes the PROJECT's copy,
   * so saving a shared process forks it rather than editing the library
   * everyone else uses. Throws with the validation errors when it is refused.
   */
  save: (definition: ProcessDefinition) => Promise<ProcessDefinition>
  /** Remove this project's copy, revealing the shared definition it shadowed. */
  remove: (processId: string) => Promise<void>
  /** Check a draft without saving it, for live feedback in the editor. */
  check: (definition: ProcessDefinition) => Promise<{ valid: boolean; errors: string[] }>
}

/**
 * The process library as one project sees it.
 *
 * Standalone hook rather than a context: the list is per-project and read by
 * one screen. Pass `projectId === undefined` to read the shared library alone.
 */
export function useProcesses(projectId: string | undefined): UseProcesses {
  const { token } = useAuth()
  const [processes, setProcesses] = useState<ProcessDefinition[]>([])
  const [kinds, setKinds] = useState<ProcessStepKind[]>([])
  const [implementedKinds, setImplementedKinds] = useState<ProcessStepKind[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const scope = useMemo(() => (projectId ? { projectId } : {}), [projectId])

  const refresh = useCallback(async () => {
    try {
      const [list, caps] = await Promise.all([
        listProcesses({ query: scope, throwOnError: true }),
        getProcessCapabilities({ throwOnError: true }),
      ])
      setProcesses(list.data as ProcessDefinition[])
      setKinds(caps.data.kinds as ProcessStepKind[])
      setImplementedKinds(caps.data.implemented as ProcessStepKind[])
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [scope])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  const save = useCallback(
    async (definition: ProcessDefinition) => {
      const { data } = await saveProcess({
        path: { processId: definition.id },
        query: scope,
        body: definition as never,
        throwOnError: true,
      })
      await refresh()
      return data as ProcessDefinition
    },
    [scope, refresh],
  )

  const remove = useCallback(
    async (processId: string) => {
      await deleteProcess({ path: { processId }, query: scope, throwOnError: true })
      await refresh()
    },
    [scope, refresh],
  )

  const check = useCallback(async (definition: ProcessDefinition) => {
    const { data } = await validateProcess({ body: definition as never, throwOnError: true })
    return data as { valid: boolean; errors: string[] }
  }, [])

  return useMemo<UseProcesses>(
    () => ({
      isLoaded,
      loadError,
      processes,
      kinds,
      implementedKinds,
      refresh,
      save,
      remove,
      check,
    }),
    [isLoaded, loadError, processes, kinds, implementedKinds, refresh, save, remove, check],
  )
}
