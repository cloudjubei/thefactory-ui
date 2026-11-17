import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitDiffSummary, GitLogCommit } from '../api'
import { OverseerGitProvider, useOverseerGit } from './OverseerGitContext'

const api = vi.hoisted(() => ({
  getLog: vi.fn(),
  getDiff: vi.fn(),
  listeners: new Map<string, () => void>(),
  ws: { on: vi.fn() },
}))

vi.mock('../api', () => ({
  useApi: () => ({ ws: api.ws }),
  getOverseerGitLog: api.getLog,
  getOverseerGitDiffSummary: api.getDiff,
}))

function commit(hash: string): GitLogCommit {
  return {
    hash,
    parents: [],
    subject: hash,
    authorName: 'Test',
    authorEmail: 'test@example.com',
    authorDate: 0,
    refs: [],
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <OverseerGitProvider>{children}</OverseerGitProvider>
}

beforeEach(() => {
  vi.resetAllMocks()
  api.listeners.clear()
  api.ws.on.mockImplementation((topic: string, listener: () => void) => {
    api.listeners.set(topic, listener)
    return () => api.listeners.delete(topic)
  })
  api.getLog.mockResolvedValue({ data: { commits: [commit('first')] } })
})

afterEach(cleanup)

describe('OverseerGitContext', () => {
  it('loads the log, refreshes on the WS event, and unsubscribes on unmount', async () => {
    const { result, unmount } = renderHook(useOverseerGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.log).toEqual([commit('first')])
    expect(api.getLog).toHaveBeenCalledExactlyOnceWith({
      query: { maxCount: 300, all: true },
      throwOnError: true,
    })
    api.getLog.mockResolvedValueOnce({ data: { commits: [commit('new')] } })
    act(() => api.listeners.get('overseer:git-status-changed')!())
    await waitFor(() => expect(result.current.log).toEqual([commit('new')]))
    expect(api.getLog).toHaveBeenCalledTimes(2)
    unmount()
    expect(api.listeners.size).toBe(0)
  })

  it.each([true, false])(
    'forwards the diff body and exact signal (includePatch=%s)',
    async (includePatch) => {
      const { result } = renderHook(useOverseerGit, { wrapper })
      await waitFor(() => expect(result.current.isLoaded).toBe(true))
      const body = { baseRef: 'parent', headRef: 'tip', includePatch }
      const diff: GitDiffSummary = { ...body, files: [], insertions: 0, deletions: 0 }
      api.getDiff.mockResolvedValueOnce({ data: diff })
      const { signal } = new AbortController()
      await expect(result.current.fetchCommitDiff(body, signal)).resolves.toBe(diff)
      expect(api.getDiff).toHaveBeenCalledExactlyOnceWith({ body, signal, throwOnError: true })
      expect(api.getDiff.mock.calls[0][0].signal).toBe(signal)
      const error = new Error('diff unavailable')
      api.getDiff.mockRejectedValueOnce(error)
      await expect(result.current.fetchCommitDiff(body, signal)).rejects.toBe(error)
    },
  )

  it('surfaces initial errors and clears them after a successful refresh', async () => {
    const error = new Error('offline')
    api.getLog.mockRejectedValueOnce(error)
    const { result } = renderHook(useOverseerGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.loadError).toBe(error)
    expect(result.current.log).toEqual([])
    await act(() => result.current.refresh())
    expect(result.current.loadError).toBeNull()
    expect(result.current.log).toEqual([commit('first')])
  })

  it('paginates with an offset, deduplicates overlaps, and stops at the last page', async () => {
    const firstPage = Array.from({ length: 300 }, (_, i) => commit(String(i)))
    api.getLog.mockResolvedValueOnce({ data: { commits: firstPage } })
    const { result } = renderHook(useOverseerGit, { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.hasMoreLog).toBe(true)
    api.getLog.mockResolvedValueOnce({ data: { commits: [firstPage[299], commit('300')] } })
    await act(() => result.current.loadMoreLog())
    expect(api.getLog).toHaveBeenLastCalledWith({
      query: { maxCount: 300, all: true, skip: 300 },
      throwOnError: true,
    })
    expect(result.current.log).toEqual([...firstPage, commit('300')])
    expect(result.current.hasMoreLog).toBe(false)
    expect(result.current.isLogLoading).toBe(false)
    await act(() => result.current.loadMoreLog())
    expect(api.getLog).toHaveBeenCalledTimes(2)
  })
})
