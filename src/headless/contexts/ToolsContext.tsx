import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { executeTool, listTools, previewTool } from '../api'
import type { ToolDescriptor, ToolExecuteResult, ToolPreviewResult } from '../api'
import { useAuth } from '../api/AuthContext'
import { useActiveProject } from './ProjectsContext'

export type ToolsContextValue = {
  isLoaded: boolean
  loadError: Error | null
  tools: ToolDescriptor[]
  executeTool: (toolName: string, args: unknown) => Promise<ToolExecuteResult>
  previewTool: (toolName: string, args: unknown) => Promise<ToolPreviewResult>
  refresh: () => Promise<void>
}

const ToolsContext = createContext<ToolsContextValue | null>(null)

const EMPTY_TOOLS: ToolDescriptor[] = []

export function ToolsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const { projectId } = useActiveProject()
  const [tools, setTools] = useState<ToolDescriptor[]>(EMPTY_TOOLS)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)

  // AbortController per refresh — StrictMode double-invoke aborts the first
  // request as the second takes over, so we never make two concurrent calls
  // for the same data.
  const abortRef = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { data } = await listTools({ signal: controller.signal, throwOnError: true })
      if (controller.signal.aborted) return
      setTools(data)
      setLoadError(null)
    } catch (err) {
      if (controller.signal.aborted) return
      setLoadError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (!controller.signal.aborted) setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    void refresh()
    return () => abortRef.current?.abort()
  }, [token, refresh])

  const requireProject = useCallback(() => {
    if (!projectId) throw new Error('No active project — cannot run tool')
    return projectId
  }, [projectId])

  const executeToolImpl = useCallback(
    async (toolName: string, args: unknown) => {
      const { data } = await executeTool({
        path: { projectId: requireProject(), toolName },
        body: { args },
        throwOnError: true,
      })
      return data
    },
    [requireProject],
  )

  const previewToolImpl = useCallback(
    async (toolName: string, args: unknown) => {
      const { data } = await previewTool({
        path: { projectId: requireProject(), toolName },
        body: { args },
        throwOnError: true,
      })
      return data
    },
    [requireProject],
  )

  const value = useMemo<ToolsContextValue>(
    () => ({
      isLoaded,
      loadError,
      tools,
      executeTool: executeToolImpl,
      previewTool: previewToolImpl,
      refresh,
    }),
    [isLoaded, loadError, tools, executeToolImpl, previewToolImpl, refresh],
  )

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>
}

export function useTools(): ToolsContextValue {
  const ctx = useContext(ToolsContext)
  if (!ctx) throw new Error('useTools must be used within ToolsProvider')
  return ctx
}
