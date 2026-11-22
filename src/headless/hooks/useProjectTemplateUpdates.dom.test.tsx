import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEMPLATE_UPDATES_AVAILABLE_LABEL } from '../utils/templateUpdatesConstants'
import { useProjectTemplateUpdates } from './useProjectTemplateUpdates'

const api = vi.hoisted(() => ({
  checkProjectTemplateUpdates: vi.fn(),
}))

vi.mock('../api/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/generated')>()
  return {
    ...actual,
    checkProjectTemplateUpdates: api.checkProjectTemplateUpdates,
  }
})

vi.mock('../api/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

const PROVENANCE = {
  templateId: 'investment-planner',
  commit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('useProjectTemplateUpdates', () => {
  it('idles with loaded state when projectId is undefined', async () => {
    const { result } = renderHook(() => useProjectTemplateUpdates(undefined))
    expect(result.current.state).toBe('loaded')
    expect(result.current.check).toBeUndefined()
    expect(result.current.available).toBe(false)
    expect(result.current.availableLabel).toBeUndefined()
    expect(api.checkProjectTemplateUpdates).not.toHaveBeenCalled()
  })

  it('exposes Template updates available when the check says so', async () => {
    api.checkProjectTemplateUpdates.mockResolvedValue({
      data: {
        available: true,
        status: 'updates-available',
        provenance: PROVENANCE,
        upstreamCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    })

    const { result } = renderHook(() => useProjectTemplateUpdates('forked-planner'))
    expect(result.current.state).toBe('loading')

    await waitFor(() => expect(result.current.state).toBe('loaded'))
    expect(api.checkProjectTemplateUpdates).toHaveBeenCalledWith({
      path: { projectId: 'forked-planner' },
      throwOnError: true,
    })
    expect(result.current.available).toBe(true)
    expect(result.current.availableLabel).toBe(TEMPLATE_UPDATES_AVAILABLE_LABEL)
    expect(result.current.check?.status).toBe('updates-available')
  })

  it('hides the banner when the project is up to date', async () => {
    api.checkProjectTemplateUpdates.mockResolvedValue({
      data: {
        available: false,
        status: 'up-to-date',
        provenance: PROVENANCE,
        upstreamCommit: PROVENANCE.commit,
      },
    })

    const { result } = renderHook(() => useProjectTemplateUpdates('forked-planner'))
    await waitFor(() => expect(result.current.state).toBe('loaded'))
    expect(result.current.available).toBe(false)
    expect(result.current.availableLabel).toBeUndefined()
  })

  it('reports not-from-template without a banner', async () => {
    api.checkProjectTemplateUpdates.mockResolvedValue({
      data: { available: false, status: 'not-from-template' },
    })

    const { result } = renderHook(() => useProjectTemplateUpdates('plain-project'))
    await waitFor(() => expect(result.current.state).toBe('loaded'))
    expect(result.current.check?.status).toBe('not-from-template')
    expect(result.current.availableLabel).toBeUndefined()
  })

  it('marks failed when the read throws', async () => {
    api.checkProjectTemplateUpdates.mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useProjectTemplateUpdates('forked-planner'))
    await waitFor(() => expect(result.current.state).toBe('failed'))
    expect(result.current.error?.message).toBe('network down')
    expect(result.current.check).toBeUndefined()
  })

  it('refresh re-reads the check', async () => {
    api.checkProjectTemplateUpdates
      .mockResolvedValueOnce({
        data: { available: false, status: 'up-to-date', provenance: PROVENANCE },
      })
      .mockResolvedValueOnce({
        data: {
          available: true,
          status: 'updates-available',
          provenance: PROVENANCE,
          upstreamCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
      })

    const { result } = renderHook(() => useProjectTemplateUpdates('forked-planner'))
    await waitFor(() => expect(result.current.available).toBe(false))

    await act(async () => {
      await result.current.refresh()
    })
    expect(result.current.available).toBe(true)
    expect(result.current.availableLabel).toBe(TEMPLATE_UPDATES_AVAILABLE_LABEL)
    expect(api.checkProjectTemplateUpdates).toHaveBeenCalledTimes(2)
  })
})
