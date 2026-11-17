import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GitProvider, useGit, useGitWithLog } from './GitContext'

const api = vi.hoisted(() => ({
  projectId: undefined as string | undefined,
  getBundle: vi.fn(),
  getLocalDiff: vi.fn(),
  getCommitDiff: vi.fn(),
  stage: vi.fn(),
  listeners: new Map<string, (data: unknown) => void>(),
  ws: { on: vi.fn() },
}))

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>()
  return {
    ...actual,
    getGitBundle: api.getBundle,
    getGitLocalDiff: api.getLocalDiff,
    getGitBranchDiffSummary: api.getCommitDiff,
    gitStage: api.stage,
  }
})
vi.mock('../api/ApiContext', () => ({ useApi: () => ({ ws: api.ws }) }))
vi.mock('./ProjectsContext', () => ({
  useActiveProject: () => ({ projectId: api.projectId, project: null }),
}))

const storage = { get: vi.fn(), set: vi.fn() }
let projectNumber = 0

function bundle(path = 'changed.ts') {
  return {
    data: {
      status: { ok: true, status: { staged: [path], unstaged: [], untracked: [] } },
      branches: { ok: true, branches: [] },
      stashes: { ok: true, stashes: [] },
      log: { commits: [] },
    },
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <GitProvider storage={storage}>{children}</GitProvider>
}

beforeEach(() => {
  vi.resetAllMocks()
  // The provider intentionally retains its SWR cache across mounts; each test owns its project.
  api.projectId = `git-context-test-${++projectNumber}`
  api.listeners.clear()
  api.ws.on.mockImplementation((topic: string, listener: (data: unknown) => void) => {
    api.listeners.set(topic, listener)
    return () => api.listeners.delete(topic)
  })
  api.getBundle.mockResolvedValue(bundle())
  api.getLocalDiff.mockResolvedValue({ data: [] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('GitContext', () => {
  it('reads a bundle without history for badges and unsubscribes on unmount', async () => {
    const { result, unmount } = renderHook(useGit, { wrapper })
    expect(result.current.isLoaded).toBe(false)
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.status).toEqual({ staged: ['changed.ts'], unstaged: [], untracked: [] })
    expect(api.getBundle).toHaveBeenCalledExactlyOnceWith({
      path: { projectId: api.projectId },
      query: { all: true, maxCount: 0 },
      signal: expect.any(AbortSignal),
      throwOnError: true,
    })
    unmount()
    expect(api.listeners.size).toBe(0)
  })

  it('requests history while a useGitWithLog consumer is mounted', async () => {
    const { result } = renderHook(useGitWithLog, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(api.getBundle.mock.calls.length).toBeGreaterThan(0)
    for (const [options] of api.getBundle.mock.calls) {
      expect(options.query).toEqual({ all: true, maxCount: 300 })
    }
    expect(result.current.hasMoreLog).toBe(false)
  })

  it('refreshes only for relevant git events and re-reads local diffs only after loading them', async () => {
    const { result } = renderHook(useGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    act(() => api.listeners.get('git:status-changed')!({ projectId: 'other-project' }))
    expect(api.getBundle).toHaveBeenCalledTimes(1)
    api.getBundle.mockResolvedValueOnce(bundle('updated.ts'))
    await act(async () => {
      api.listeners.get('git:status-changed')!({ projectId: api.projectId })
    })
    expect(result.current.status?.staged).toEqual(['updated.ts'])
    expect(api.getLocalDiff).not.toHaveBeenCalled()
    await act(() => result.current.loadLocalDiff())
    expect(api.getLocalDiff).toHaveBeenCalledTimes(2)
    await act(async () => {
      api.listeners.get('git:status-changed')!({ projectIds: [api.projectId] })
    })
    expect(api.getLocalDiff).toHaveBeenCalledTimes(4)
  })

  it('debounces file changes and cancels the pending refresh on unmount', async () => {
    const { result, unmount } = renderHook(useGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    vi.useFakeTimers()
    act(() => {
      const emit = api.listeners.get('files:changed')!
      emit({ projectId: 'other-project' })
      vi.advanceTimersByTime(250)
    })
    expect(api.getBundle).toHaveBeenCalledTimes(1)
    act(() => {
      const emit = api.listeners.get('files:changed')!
      emit({ projectId: api.projectId })
      emit({ projectId: api.projectId })
      vi.advanceTimersByTime(249)
    })
    expect(api.getBundle).toHaveBeenCalledTimes(1)
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(api.getBundle).toHaveBeenCalledTimes(2)
    act(() => api.listeners.get('files:changed')!({ projectId: api.projectId }))
    unmount()
    await act(async () => {
      vi.advanceTimersByTime(250)
    })
    expect(api.getBundle).toHaveBeenCalledTimes(2)
  })

  it('ignores an old project response even if its SDK request resolves after abort', async () => {
    let resolveOld!: (value: ReturnType<typeof bundle>) => void
    api.getBundle.mockImplementationOnce(
      () => new Promise<ReturnType<typeof bundle>>((resolve) => (resolveOld = resolve)),
    )
    const { result, rerender } = renderHook(useGit, { wrapper })
    await waitFor(() => expect(api.getBundle).toHaveBeenCalledTimes(1))
    const oldSignal = api.getBundle.mock.calls[0][0].signal
    api.projectId = `git-context-test-${++projectNumber}`
    api.getBundle.mockResolvedValueOnce(bundle('new-project.ts'))
    rerender()
    await waitFor(() => expect(result.current.status?.staged).toEqual(['new-project.ts']))
    expect(oldSignal.aborted).toBe(true)
    await act(async () => resolveOld(bundle('old-project.ts')))
    expect(result.current.status?.staged).toEqual(['new-project.ts'])
  })

  it('surfaces refresh errors and clears them on retry', async () => {
    const error = new Error('bundle unavailable')
    api.getBundle.mockRejectedValueOnce(error)
    const { result } = renderHook(useGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.loadError).toBe(error)
    await act(() => result.current.refresh())
    expect(result.current.loadError).toBeNull()
    expect(result.current.status?.staged).toEqual(['changed.ts'])
  })

  it('forwards mutation and commit-diff bodies with the active project', async () => {
    const { result } = renderHook(useGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    await act(() => result.current.stage(['file.ts']))
    expect(api.stage).toHaveBeenCalledExactlyOnceWith({
      path: { projectId: api.projectId },
      body: { paths: ['file.ts'] },
      throwOnError: true,
    })
    expect(api.getBundle).toHaveBeenCalledTimes(2)
    const diff = { baseRef: 'parent', headRef: 'tip', files: [], insertions: 0, deletions: 0 }
    api.getCommitDiff.mockResolvedValueOnce({ data: diff })
    await expect(result.current.getCommitDiff('parent', 'tip')).resolves.toBe(diff)
    expect(api.getCommitDiff).toHaveBeenCalledExactlyOnceWith({
      path: { projectId: api.projectId },
      body: { baseRef: 'parent', headRef: 'tip', includePatch: true },
      throwOnError: true,
    })
  })

  it('persists merged preferences per project and clears selection on a project switch', async () => {
    storage.get.mockReturnValue(JSON.stringify({ autoPush: true }))
    const { result, rerender } = renderHook(useGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    act(() => {
      result.current.setMergePreferences({ deleteRemoteAfterMerge: true })
      result.current.setSelection({ kind: 'branch', branchName: 'main' })
    })
    expect(result.current.selection).toEqual({ kind: 'branch', branchName: 'main' })
    expect(storage.set).toHaveBeenLastCalledWith(
      `git.mergePrefs:${api.projectId}`,
      JSON.stringify({ autoPush: true, deleteRemoteAfterMerge: true }),
    )
    storage.get.mockReturnValue(null)
    api.projectId = undefined
    rerender()
    expect(result.current.selection).toBeNull()
    expect(result.current.mergePreferences).toEqual({
      autoPush: false,
      deleteRemoteAfterMerge: false,
    })
    expect(result.current.status).toBeNull()
    await expect(result.current.stage(['file.ts'])).rejects.toThrow('No active project')
  })
})
