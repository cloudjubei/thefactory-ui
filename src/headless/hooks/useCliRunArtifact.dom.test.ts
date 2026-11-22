import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getRun: vi.fn(), verify: vi.fn() }))
vi.mock('../api/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/generated')>()),
  getCliAgentRun: api.getRun,
  verifyCliRunReview: api.verify,
}))
vi.mock('../api/ApiContext', () => ({
  useApi: () => ({ ws: { on: () => () => {}, onReconnect: () => () => {} } }),
}))

import { useCliRunArtifact } from './useCliRunArtifact'

const RUN = {
  id: 'run-1',
  projectId: 'proj',
  status: 'succeeded',
  transcript: [],
  artifacts: [],
  createdAt: 1,
  updatedAt: 1,
}
const MERGED = { status: 'passed', startedAt: 1, finishedAt: 2, checks: [] }

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function mounted() {
  api.getRun.mockResolvedValue({ data: RUN })
  const hook = renderHook(() => useCliRunArtifact('run-1', 'proj'))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useCliRunArtifact verify', () => {
  it('sends only the asked-for checks and says which are running until they answer', async () => {
    const answer = deferred<{ data: unknown }>()
    api.verify.mockReturnValue(answer.promise)
    const { result } = await mounted()
    expect(result.current.verifyingCheckIds).toBeUndefined()

    let done!: Promise<void>
    act(() => {
      done = result.current.verify(['unit'])
    })
    expect(api.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { runId: 'run-1' },
        body: { projectId: 'proj', checkIds: ['unit'] },
      }),
    )
    expect(result.current.verifying).toBe(true)
    expect(result.current.verifyingCheckIds).toEqual(['unit'])
    expect(result.current.verifyStartedAtMs).toEqual(expect.any(Number))

    await act(async () => {
      answer.resolve({ data: MERGED })
      await done
    })
    expect(result.current.verifying).toBe(false)
    expect(result.current.verifyingCheckIds).toBeUndefined()
    expect(result.current.verifyStartedAtMs).toBeUndefined()
    expect(result.current.verification).toMatchObject({ status: 'passed' })
  })

  it('runs the whole pass when no check is named, marked by an empty list', async () => {
    const answer = deferred<{ data: unknown }>()
    api.verify.mockReturnValue(answer.promise)
    const { result } = await mounted()
    act(() => {
      void result.current.verify()
    })
    expect(api.verify).toHaveBeenCalledWith(
      expect.objectContaining({ body: { projectId: 'proj' } }),
    )
    expect(result.current.verifyingCheckIds).toEqual([])
    await act(async () => answer.resolve({ data: MERGED }))
  })

  it('ignores a second press while one verify is in flight', async () => {
    const answer = deferred<{ data: unknown }>()
    api.verify.mockReturnValue(answer.promise)
    const { result } = await mounted()
    act(() => {
      void result.current.verify(['unit'])
      void result.current.verify(['lint'])
    })
    expect(api.verify).toHaveBeenCalledTimes(1)
    expect(result.current.verifyingCheckIds).toEqual(['unit'])
    await act(async () => answer.resolve({ data: MERGED }))
  })

  it('releases an in-flight verify when the run changes so the next run can start its own', async () => {
    const first = deferred<{ data: unknown }>()
    api.verify.mockReturnValue(first.promise)
    api.getRun.mockResolvedValue({ data: RUN })
    const { result, rerender } = renderHook(
      ({ runId }: { runId: string }) => useCliRunArtifact(runId, 'proj'),
      { initialProps: { runId: 'run-1' } },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      void result.current.verify(['unit'])
    })
    expect(result.current.verifying).toBe(true)
    expect(result.current.verifyingCheckIds).toEqual(['unit'])

    api.getRun.mockResolvedValue({ data: { ...RUN, id: 'run-2' } })
    rerender({ runId: 'run-2' })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.verifying).toBe(false)
    expect(result.current.verifyingCheckIds).toBeUndefined()
    expect(result.current.verifyStartedAtMs).toBeUndefined()

    const second = deferred<{ data: unknown }>()
    api.verify.mockReturnValue(second.promise)
    act(() => {
      void result.current.verify(['lint'])
    })
    expect(api.verify).toHaveBeenCalledTimes(2)
    expect(api.verify).toHaveBeenLastCalledWith(
      expect.objectContaining({
        path: { runId: 'run-2' },
        body: { projectId: 'proj', checkIds: ['lint'] },
      }),
    )
    expect(result.current.verifying).toBe(true)
    expect(result.current.verifyingCheckIds).toEqual(['lint'])

    await act(async () => {
      first.resolve({ data: { status: 'failed', startedAt: 1, finishedAt: 2, checks: [] } })
    })
    expect(result.current.verifying).toBe(true)
    expect(result.current.verifyingCheckIds).toEqual(['lint'])
    expect(result.current.verification?.status).not.toBe('failed')

    await act(async () => {
      second.resolve({ data: MERGED })
    })
    expect(result.current.verifying).toBe(false)
    expect(result.current.verifyingCheckIds).toBeUndefined()
    expect(result.current.verification).toMatchObject({ status: 'passed' })
  })
})
