// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjectServeSettings } from '../../../headless/hooks/useProjectServeSettings'
import { SERVE_BUILD_LIMIT_MINUTE_MS } from '../../../headless/utils/serveBuildLimitConstants'

/**
 * Mounts the headless hook. The test lives under web because headless code
 * cannot import react-dom.
 */

type Project = { id: string; metadata?: Record<string, unknown> }
type Gate = { resolve: (value: unknown) => void; reject: (err: unknown) => void }

const harness = vi.hoisted(() => ({
  projects: [] as Project[],
  getProjectServeSettings: vi.fn(),
  setProjectServeSettings: vi.fn(),
}))

vi.mock('../../../headless/contexts/ProjectsContext', () => ({
  useProjects: () => ({
    projects: harness.projects,
    isLoaded: true,
    loadError: null,
    activeProjectId: harness.projects[0]?.id,
    activeProject: harness.projects[0],
    setActiveProjectId: () => {},
    refresh: async () => {},
  }),
}))

vi.mock('../../../headless/api', () => ({
  extractErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error && err.message.trim() ? err.message : fallback,
  getProjectServeSettings: (...args: unknown[]) => harness.getProjectServeSettings(...args),
  setProjectServeSettings: (...args: unknown[]) => harness.setProjectServeSettings(...args),
}))

const FORTY_FIVE_MS = 45 * SERVE_BUILD_LIMIT_MINUTE_MS
const SIXTY_MS = 60 * SERVE_BUILD_LIMIT_MINUTE_MS

function held(buildTimeoutMs: number | null) {
  return Promise.resolve({ data: { buildTimeoutMs } })
}

function gate() {
  const pending: Gate[] = []
  const start = () =>
    new Promise((resolve, reject) => {
      pending.push({ resolve, reject })
    })
  return { pending, start }
}

describe('useProjectServeSettings', () => {
  beforeEach(() => {
    harness.projects = [{ id: 'p1', metadata: {} }]
    harness.getProjectServeSettings.mockReset()
    harness.setProjectServeSettings.mockReset()
    harness.getProjectServeSettings.mockImplementation(() => held(FORTY_FIVE_MS))
  })

  afterEach(() => {
    cleanup()
  })

  async function mount() {
    const view = renderHook((projectId: string) => useProjectServeSettings(projectId), {
      initialProps: 'p1',
    })
    await act(async () => {})
    return view
  }

  it('shows the limit the project serve settings hold, once they are read', async () => {
    const { result } = await mount()
    expect(harness.getProjectServeSettings).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      throwOnError: true,
    })
    expect(result.current.ready).toBe(true)
    expect(result.current.field.text).toBe('45')
    expect(result.current.field.dirty).toBe(false)
  })

  it('is not ready while the settings are being read', () => {
    harness.getProjectServeSettings.mockImplementation(gate().start)
    const { result } = renderHook(() => useProjectServeSettings('p1'))
    expect(result.current.ready).toBe(false)
  })

  it('saves through the serve settings and shows the new limit before the answer comes', async () => {
    const save = gate()
    harness.setProjectServeSettings.mockImplementation(save.start)
    const { result } = await mount()
    act(() => result.current.setText('60'))
    act(() => result.current.save())

    expect(harness.setProjectServeSettings).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { buildTimeoutMs: SIXTY_MS },
      throwOnError: true,
    })
    expect(result.current.field.text).toBe('60')
    expect(result.current.field.dirty).toBe(false)
    expect(result.current.saved).toBe(true)

    await act(async () => save.pending[0]?.resolve({ data: { buildTimeoutMs: SIXTY_MS } }))
    expect(result.current.saving).toBe(false)
    expect(result.current.field.text).toBe('60')
  })

  it('saves a blank field as no limit, so the default applies', async () => {
    harness.setProjectServeSettings.mockImplementation(() => held(null))
    const { result } = await mount()
    act(() => result.current.setText(' '))
    await act(async () => result.current.save())

    expect(harness.setProjectServeSettings).toHaveBeenCalledWith({
      path: { projectId: 'p1' },
      body: { buildTimeoutMs: null },
      throwOnError: true,
    })
    expect(result.current.field.text).toBe('')
    expect(result.current.field.dirty).toBe(false)
  })

  it('puts the held limit back and says why when the save fails', async () => {
    const save = gate()
    harness.setProjectServeSettings.mockImplementation(save.start)
    const { result } = await mount()
    act(() => result.current.setText('60'))
    act(() => result.current.save())
    await act(async () => save.pending[0]?.reject(new Error('Refused')))

    expect(result.current.saved).toBe(false)
    expect(result.current.saveError).toBe('Refused')
    expect(result.current.field.text).toBe('60')
    expect(result.current.field.dirty).toBe(true)
  })

  it('keeps a value typed while a save is answered', async () => {
    const save = gate()
    harness.setProjectServeSettings.mockImplementation(save.start)
    const { result } = await mount()
    act(() => result.current.setText('60'))
    act(() => result.current.save())
    act(() => result.current.setText('90'))
    await act(async () => save.pending[0]?.resolve({ data: { buildTimeoutMs: SIXTY_MS } }))

    expect(result.current.field.text).toBe('90')
    expect(result.current.field.dirty).toBe(true)
    expect(harness.setProjectServeSettings).toHaveBeenCalledTimes(1)
  })

  it('reads the settings again when the project changes elsewhere', async () => {
    const { result, rerender } = await mount()
    harness.getProjectServeSettings.mockImplementation(() => held(SIXTY_MS))
    harness.projects = [{ id: 'p1', metadata: { serveStack: {} } }]
    rerender('p1')
    await act(async () => {})

    expect(harness.getProjectServeSettings).toHaveBeenCalledTimes(2)
    expect(result.current.field.text).toBe('60')
  })
})
