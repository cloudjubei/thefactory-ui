import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TEMPLATE_FORK_DONE_TIMEOUT_MS,
  TEMPLATE_FORK_PROGRESS_EVENT,
} from '../utils/createFromTemplateConstants'
import { TemplatesProvider, useTemplates } from './TemplatesContext'

const api = vi.hoisted(() => ({
  listTemplates: vi.fn(),
  createProjectFromTemplate: vi.fn(),
  abortCreateProjectFromTemplate: vi.fn(),
  listeners: new Map<string, (data: unknown) => void>(),
  ws: { on: vi.fn() },
  hasWs: true as boolean,
}))

vi.mock('../api/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/generated')>()
  return {
    ...actual,
    listTemplates: api.listTemplates,
    createProjectFromTemplate: api.createProjectFromTemplate,
    abortCreateProjectFromTemplate: api.abortCreateProjectFromTemplate,
  }
})

vi.mock('../api/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

vi.mock('../api/ApiContext', () => ({
  useOptionalApi: () => (api.hasWs ? { ws: api.ws } : null),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <TemplatesProvider>{children}</TemplatesProvider>
}

function doneProgress(jobId: string, extra: { error?: string } = {}) {
  return {
    jobId,
    templateId: 'tpl-1',
    projectId: 'proj-1',
    phase: 'done' as const,
    message: 'Done',
    ...extra,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  api.hasWs = true
  api.listeners.clear()
  api.ws.on.mockImplementation((topic: string, listener: (data: unknown) => void) => {
    api.listeners.set(topic, listener)
    return () => api.listeners.delete(topic)
  })
  api.listTemplates.mockResolvedValue({ data: { templates: [] } })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('TemplatesContext abortCreateFromTemplate', () => {
  it('rejects the waiter when the backend aborts the job', async () => {
    api.createProjectFromTemplate.mockResolvedValue({ data: { jobId: 'job-abort' } })
    api.abortCreateProjectFromTemplate.mockResolvedValue({ data: { aborted: true } })

    const { result } = renderHook(useTemplates, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let done!: Promise<unknown>
    await act(async () => {
      const started = await result.current.createFromTemplate({
        templateId: 'tpl-1',
        id: 'proj-1',
      })
      done = started.done
    })

    let settled: { status: 'fulfilled' | 'rejected'; reason?: unknown } | undefined
    void done.then(
      () => {
        settled = { status: 'fulfilled' }
      },
      (reason: unknown) => {
        settled = { status: 'rejected', reason }
      },
    )

    let aborted = false
    await act(async () => {
      aborted = await result.current.abortCreateFromTemplate('job-abort')
    })

    expect(aborted).toBe(true)
    await waitFor(() => expect(settled?.status).toBe('rejected'))
    expect(settled?.reason).toEqual(new Error('from-template aborted'))
  })

  it('leaves the waiter when abort reports already finished so a late Cancel keeps a successful create', async () => {
    api.createProjectFromTemplate.mockResolvedValue({ data: { jobId: 'job-done' } })
    api.abortCreateProjectFromTemplate.mockResolvedValue({ data: { aborted: false } })

    const { result } = renderHook(useTemplates, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let done!: Promise<unknown>
    await act(async () => {
      const started = await result.current.createFromTemplate({
        templateId: 'tpl-1',
        id: 'proj-1',
      })
      done = started.done
    })

    let settled: { status: 'fulfilled' | 'rejected'; value?: unknown; reason?: unknown } | undefined
    void done.then(
      (value) => {
        settled = { status: 'fulfilled', value }
      },
      (reason: unknown) => {
        settled = { status: 'rejected', reason }
      },
    )

    let aborted = true
    await act(async () => {
      aborted = await result.current.abortCreateFromTemplate('job-done')
    })

    expect(aborted).toBe(false)
    expect(settled).toBeUndefined()

    const progress = doneProgress('job-done')
    await act(async () => {
      api.listeners.get(TEMPLATE_FORK_PROGRESS_EVENT)!(progress)
    })

    await waitFor(() => expect(settled?.status).toBe('fulfilled'))
    expect(settled?.value).toEqual(progress)
  })
})

describe('TemplatesContext createFromTemplate done settlement', () => {
  it('rejects the done promise when ApiContext/ws is missing so submit cannot hang', async () => {
    api.hasWs = false
    api.createProjectFromTemplate.mockResolvedValue({ data: { jobId: 'job-no-ws' } })

    const { result } = renderHook(useTemplates, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    let settled: { status: 'fulfilled' | 'rejected'; reason?: unknown } | undefined
    await act(async () => {
      const started = await result.current.createFromTemplate({
        templateId: 'tpl-1',
        id: 'proj-1',
      })
      void started.done.then(
        () => {
          settled = { status: 'fulfilled' }
        },
        (reason: unknown) => {
          settled = { status: 'rejected', reason }
        },
      )
    })

    await waitFor(() => expect(settled?.status).toBe('rejected'))
    expect(settled?.reason).toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/websocket|WebSocket|progress/i),
      }),
    )
  })

  it('rejects the done promise when no terminal progress arrives before the timeout', async () => {
    api.createProjectFromTemplate.mockResolvedValue({ data: { jobId: 'job-hang' } })

    const { result } = renderHook(useTemplates, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    vi.useFakeTimers()

    let done!: Promise<unknown>
    await act(async () => {
      const started = await result.current.createFromTemplate({
        templateId: 'tpl-1',
        id: 'proj-1',
      })
      done = started.done
    })

    let settled: { status: 'fulfilled' | 'rejected'; reason?: unknown } | undefined
    void done.then(
      () => {
        settled = { status: 'fulfilled' }
      },
      (reason: unknown) => {
        settled = { status: 'rejected', reason }
      },
    )

    expect(settled).toBeUndefined()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TEMPLATE_FORK_DONE_TIMEOUT_MS)
    })

    expect(settled?.status).toBe('rejected')
    expect(settled?.reason).toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/timed out|timeout/i),
      }),
    )
  })
})
