import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  listTemplates,
  createProjectFromTemplate as sdkCreateProjectFromTemplate,
  abortCreateProjectFromTemplate as sdkAbortCreateProjectFromTemplate,
  type Template,
  type TemplateForkProgress,
} from '../api/generated'
import { useAuth } from '../api/AuthContext'
import { useOptionalApi } from '../api/ApiContext'
import { isForkProgressTerminal, parseTemplateForkProgress } from '../utils/createFromTemplate'
import {
  TEMPLATE_FORK_DONE_TIMEOUT_MS,
  TEMPLATE_FORK_PROGRESS_EVENT,
} from '../utils/createFromTemplateConstants'

export type { Template, TemplateForkProgress }

export interface CreateFromTemplateGithubInput {
  tokenId?: string
  name: string
  private?: boolean
}

export interface CreateFromTemplateInput {
  templateId: string
  id: string
  mainGroupId?: string | null
  github?: CreateFromTemplateGithubInput
}

export type CreateFromTemplateResult = {
  jobId: string
  /**
   * Resolves when the job reaches `done` or `error` (or the abort settles).
   * Rejects if there is no WebSocket to observe progress, or if no terminal
   * event arrives within {@link TEMPLATE_FORK_DONE_TIMEOUT_MS}.
   */
  done: Promise<TemplateForkProgress>
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
   * Start forking a template into a new project. Returns immediately with a
   * `jobId`; progress streams on `template:fork-progress` and is mirrored on
   * {@link TemplatesContextValue.forkProgress}. The created project's
   * `title` / `description` / `codeInfo` / `scopeGroupIds` are inherited from
   * the template's canonical `.factory/template/project.json`.
   */
  createFromTemplate: (input: CreateFromTemplateInput) => Promise<CreateFromTemplateResult>
  /** Ask the backend to stop an in-flight from-template job. */
  abortCreateFromTemplate: (jobId: string) => Promise<boolean>
  /** Latest progress event for the job started by this client, if any. */
  forkProgress: TemplateForkProgress | null
}

/** Exported so the design playground can paint fixed fork-progress without a backend. */
export const TemplatesContext = createContext<TemplatesContextValue | null>(null)

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const api = useOptionalApi()

  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [forkProgress, setForkProgress] = useState<TemplateForkProgress | null>(null)

  const activeJobIdRef = useRef<string | null>(null)
  const waitersRef = useRef(
    new Map<
      string,
      {
        resolve: (p: TemplateForkProgress) => void
        reject: (err: Error) => void
        timer: ReturnType<typeof setTimeout>
      }
    >(),
  )

  const settleWaiter = useCallback(
    (
      jobId: string,
      action: (waiter: {
        resolve: (p: TemplateForkProgress) => void
        reject: (err: Error) => void
      }) => void,
    ) => {
      const waiter = waitersRef.current.get(jobId)
      if (!waiter) return
      waitersRef.current.delete(jobId)
      clearTimeout(waiter.timer)
      action(waiter)
    },
    [],
  )

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

  useEffect(() => {
    if (!api?.ws) return
    return api.ws.on(TEMPLATE_FORK_PROGRESS_EVENT, (data: unknown) => {
      const progress = parseTemplateForkProgress(data)
      if (!progress) return
      if (activeJobIdRef.current && progress.jobId !== activeJobIdRef.current) return
      setForkProgress(progress)
      if (!isForkProgressTerminal(progress)) return
      settleWaiter(progress.jobId, (waiter) => {
        if (progress.phase === 'error') {
          waiter.reject(new Error(progress.error?.trim() || 'Create from template failed'))
        } else {
          waiter.resolve(progress)
        }
      })
      if (activeJobIdRef.current === progress.jobId) {
        activeJobIdRef.current = null
      }
    })
  }, [api?.ws, settleWaiter])

  const createFromTemplate = useCallback(
    async (input: CreateFromTemplateInput): Promise<CreateFromTemplateResult> => {
      setForkProgress(null)
      const { data } = await sdkCreateProjectFromTemplate({
        body: {
          templateId: input.templateId,
          id: input.id,
          ...(input.mainGroupId !== undefined ? { mainGroupId: input.mainGroupId } : {}),
          ...(input.github ? { github: input.github } : {}),
        },
        throwOnError: true,
      })
      const jobId = data.jobId
      activeJobIdRef.current = jobId
      const done = new Promise<TemplateForkProgress>((resolve, reject) => {
        // Without a WS, terminal progress can never arrive — reject on a
        // microtask so callers can attach handlers before the rejection is
        // observed (avoids an unhandled rejection during assignment).
        if (!api?.ws) {
          queueMicrotask(() => {
            reject(
              new Error(
                'Cannot observe create-from-template progress without a WebSocket connection',
              ),
            )
            if (activeJobIdRef.current === jobId) activeJobIdRef.current = null
          })
          return
        }
        const timer = setTimeout(() => {
          settleWaiter(jobId, (waiter) => {
            waiter.reject(new Error('Create from template timed out waiting for progress'))
          })
          if (activeJobIdRef.current === jobId) activeJobIdRef.current = null
        }, TEMPLATE_FORK_DONE_TIMEOUT_MS)
        waitersRef.current.set(jobId, { resolve, reject, timer })
      })
      return { jobId, done }
    },
    [api?.ws, settleWaiter],
  )

  const abortCreateFromTemplate = useCallback(
    async (jobId: string): Promise<boolean> => {
      const { data } = await sdkAbortCreateProjectFromTemplate({
        body: { jobId },
        throwOnError: true,
      })
      // Only reject when the backend actually aborted. If the job already
      // finished (`aborted: false`), leave the waiter for the imminent done
      // WS event — a late Cancel must not drop a successful create.
      if (data.aborted === true) {
        settleWaiter(jobId, (waiter) => {
          waiter.reject(new Error('from-template aborted'))
        })
        if (activeJobIdRef.current === jobId) activeJobIdRef.current = null
      }
      return data.aborted === true
    },
    [settleWaiter],
  )

  const value = useMemo<TemplatesContextValue>(
    () => ({
      isLoaded,
      loadError,
      templates,
      refresh,
      createFromTemplate,
      abortCreateFromTemplate,
      forkProgress,
    }),
    [
      isLoaded,
      loadError,
      templates,
      refresh,
      createFromTemplate,
      abortCreateFromTemplate,
      forkProgress,
    ],
  )

  return <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
}

export function useTemplates(): TemplatesContextValue {
  const ctx = useContext(TemplatesContext)
  if (!ctx) throw new Error('useTemplates must be used within TemplatesProvider')
  return ctx
}
