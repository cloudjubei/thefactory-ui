import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  listTemplates,
  createProjectFromTemplate as sdkCreateProjectFromTemplate,
  type Template,
  type GetProjectResponse,
} from '../api/generated'
import { useAuth } from '../api/AuthContext'

export type { Template }

export interface CreateFromTemplateInput {
  templateId: string
  id: string
  mainGroupId?: string
}

export type TemplatesContextValue = {
  /** True once the first fetch has completed, whether it succeeded or failed. */
  isLoaded: boolean
  /** Set to the last fetch error; cleared on the next successful refresh. */
  loadError: Error | null
  templates: Template[]
  /** Force a refetch of the catalog. */
  refresh: () => Promise<void>
  /**
   * Fork a template into a new local-only project. Mirrors the codebase's
   * convention of bundling mutations into their owning context (see
   * `LLMConfigsContext.createConfig`) rather than as a standalone hook.
   * The created project's `title` / `description` / `codeInfo` /
   * `scopeGroupIds` are inherited from the template's canonical
   * `.factory/template/project.json`; the caller doesn't supply them.
   */
  createFromTemplate: (input: CreateFromTemplateInput) => Promise<GetProjectResponse>
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()

  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await listTemplates({ throwOnError: true })
      setTemplates(data.templates)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    void refresh()
  }, [token, refresh])

  const createFromTemplate = useCallback(
    async (input: CreateFromTemplateInput): Promise<GetProjectResponse> => {
      const { data } = await sdkCreateProjectFromTemplate({
        body: input,
        throwOnError: true,
      })
      return data
    },
    [],
  )

  const value = useMemo<TemplatesContextValue>(
    () => ({ isLoaded, loadError, templates, refresh, createFromTemplate }),
    [isLoaded, loadError, templates, refresh, createFromTemplate],
  )

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
}

export function useTemplates(): TemplatesContextValue {
  const ctx = useContext(TemplatesContext)
  if (!ctx) throw new Error('useTemplates must be used within TemplatesProvider')
  return ctx
}
