// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjectServeSettings } from '../../../headless/hooks/useProjectServeSettings'
import {
  SERVE_BUILD_LIMIT_METADATA_KEY,
  SERVE_BUILD_LIMIT_MINUTE_MS,
} from '../../../headless/utils/serveBuildLimitConstants'

/**
 * Mounts the headless hook. The test lives under web because headless code
 * cannot import react-dom.
 */

type Project = { id: string; metadata?: Record<string, unknown> }

const harness = vi.hoisted(() => ({
  projects: [] as Project[],
  updateProject: vi.fn(),
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
  updateProject: (...args: unknown[]) => harness.updateProject(...args),
}))

type Gate = { resolve: (value?: unknown) => void }

function openGate() {
  const pending: Gate[] = []
  const start = () =>
    new Promise((resolve) => {
      pending.push({ resolve })
    })
  return { pending, start }
}

const FORTY_FIVE_MS = 45 * SERVE_BUILD_LIMIT_MINUTE_MS

function project(metadata: Record<string, unknown> = {}): Project {
  return { id: 'p1', metadata }
}

describe('useProjectServeSettings', () => {
  beforeEach(() => {
    harness.projects = [project()]
    harness.updateProject.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  function mount() {
    return renderHook((projectId: string) => useProjectServeSettings(projectId), {
      initialProps: 'p1',
    })
  }

  async function saveMinutes(result: ReturnType<typeof mount>['result'], minutes: string) {
    const save = openGate()
    harness.updateProject.mockImplementation(save.start)
    act(() => {
      result.current.setText(minutes)
    })
    act(() => {
      result.current.save()
    })
    await act(async () => {
      save.pending[0]?.resolve({})
    })
  }

  it('keeps a value typed after Save when the projects list refreshes', async () => {
    const { result, rerender } = mount()
    await saveMinutes(result, '45')
    expect(result.current.saving).toBe(false)
    expect(result.current.field.text).toBe('45')
    expect(harness.updateProject).toHaveBeenCalledWith({
      path: { id: 'p1' },
      body: { metadata: { [SERVE_BUILD_LIMIT_METADATA_KEY]: FORTY_FIVE_MS } },
      throwOnError: true,
    })

    act(() => {
      result.current.setText('60')
    })
    harness.projects = [project({ [SERVE_BUILD_LIMIT_METADATA_KEY]: FORTY_FIVE_MS })]
    rerender('p1')

    expect(result.current.field.text).toBe('60')
    expect(result.current.field.dirty).toBe(true)
    expect(harness.updateProject).toHaveBeenCalledTimes(1)
  })

  it('shows the saved limit once the list echoes it, when nothing newer was typed', async () => {
    const { result, rerender } = mount()
    await saveMinutes(result, '45')
    harness.projects = [project({ [SERVE_BUILD_LIMIT_METADATA_KEY]: FORTY_FIVE_MS })]
    rerender('p1')

    expect(result.current.field.text).toBe('45')
    expect(result.current.field.dirty).toBe(false)
    expect(result.current.saved).toBe(true)
  })
})
