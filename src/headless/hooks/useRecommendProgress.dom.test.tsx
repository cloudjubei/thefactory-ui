import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WsClient } from '../api/WsClient'
import { useRecommendProgress } from './useRecommendProgress'
import type { RecommendProgressData } from '../api/generated'

const mocks = vi.hoisted(() => ({ api: {} as { ws: WsClient }, read: vi.fn(), records: vi.fn() }))
vi.mock('../api/ApiContext', () => ({ useOptionalApi: () => mocks.api }))
vi.mock('../api/generated', () => ({
  getActivity: (...args: unknown[]) => mocks.read(...args),
  listProjectData: (...args: unknown[]) => mocks.records(...args),
}))

function emit(ws: WsClient, event: string, data: unknown) {
  ;(ws as unknown as { onMessage: (event: { data: string }) => void }).onMessage({
    data: JSON.stringify({ event, data }),
  })
}
const checkpoint: RecommendProgressData = {
  projectId: 'p',
  activityId: 'a',
  recordType: 'products',
  stepKey: 'gather',
  progress: {
    phase: 'items',
    suppliersDone: 1,
    suppliersTotal: 2,
    suppliers: ['Chairs', 'Desks'],
    supplierStates: { Chairs: 'done', Desks: 'gathering' },
    itemsSoFar: 1,
    categoryResult: {
      categoryPath: ['Chairs'],
      status: 'deadline',
      items: [{ key: 'chair', identity: { name: 'Oak chair' }, summary: 'Partial chair' } as never],
    },
  },
}

describe('live recommendation hook', () => {
  beforeEach(() => {
    mocks.api.ws = new WsClient({ baseUrl: '', getToken: () => null })
    mocks.read.mockReset().mockResolvedValue({
      data: {
        recordType: 'products',
        status: 'running',
        steps: [{ key: 'gather', status: 'running' }],
      },
    })
    mocks.records.mockReset().mockResolvedValue({ data: [] })
  })
  it('subscribes live, retains deadline partials on stop, and removes listeners on unmount', async () => {
    const hook = renderHook(() => useRecommendProgress({ projectId: 'p', activityId: 'a' }))
    await waitFor(() => expect(hook.result.current.status).toBe('running'))
    act(() => emit(mocks.api.ws, 'recommend:progress', checkpoint))
    expect(hook.result.current.state.steps.gather?.items[0]?.identity.name).toBe('Oak chair')
    act(() =>
      emit(mocks.api.ws, 'recommend:progress', {
        ...checkpoint,
        activityId: 'other',
        progress: { ...checkpoint.progress, itemsSoFar: 99 },
      }),
    )
    expect(hook.result.current.state.steps.gather?.progress.itemsSoFar).toBe(1)
    mocks.read.mockResolvedValue({ data: { recordType: 'products', status: 'aborted', steps: [] } })
    act(() => emit(mocks.api.ws, 'activity:updated', { scope: 'p', activityId: 'a' }))
    await waitFor(() => expect(hook.result.current.status).toContain('Stopped'))
    expect(hook.result.current.state.steps.gather?.items).toHaveLength(1)
    hook.unmount()
    mocks.read.mockClear()
    act(() => emit(mocks.api.ws, 'activity:updated', { scope: 'p', activityId: 'a' }))
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('merges a delayed checkpoint with live categories without reverting live revisions', async () => {
    let resolve!: (value: { data: { content: typeof checkpoint.progress }[] }) => void
    mocks.records.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const hook = renderHook(() => useRecommendProgress({ projectId: 'p', activityId: 'a' }))
    await waitFor(() => expect(mocks.records).toHaveBeenCalledTimes(1))
    const chair = checkpoint.progress.categoryResult!.items[0]!
    const live: RecommendProgressData = {
      ...checkpoint,
      progress: {
        ...checkpoint.progress,
        itemsSoFar: 2,
        suppliersDone: 2,
        categoryResult: {
          categoryPath: ['Desks'],
          status: 'completed',
          items: [
            { ...chair, key: 'desk' },
            { ...chair, summary: 'New live revision' },
          ],
        },
      },
    }
    act(() => emit(mocks.api.ws, 'recommend:progress', live))
    await act(async () =>
      resolve({
        data: [
          {
            content: {
              ...checkpoint.progress,
              categoryResult: {
                ...checkpoint.progress.categoryResult!,
                items: [chair, { ...chair, key: 'stool', summary: 'Earlier category item' }],
              },
            },
          },
        ],
      }),
    )
    const gathered = hook.result.current.state.steps.gather!
    expect(gathered.items.map((item) => item.key).sort()).toEqual(['chair', 'desk', 'stool'])
    expect(gathered.items.find((item) => item.key === 'chair')?.summary).toBe('New live revision')
    expect(gathered.progress).toEqual(live.progress)
    hook.unmount()
  })
  it('hydrates gathering results under gather even when ranking is running', async () => {
    mocks.read.mockResolvedValue({
      data: {
        recordType: 'products',
        status: 'running',
        steps: [
          { key: 'gather', status: 'completed' },
          { key: 'rank', status: 'running' },
        ],
      },
    })
    mocks.records.mockResolvedValue({ data: [{ content: checkpoint.progress }] })
    const hook = renderHook(() => useRecommendProgress({ projectId: 'p', activityId: 'a' }))
    await waitFor(() => expect(hook.result.current.state.steps.gather?.items).toHaveLength(1))
    expect(hook.result.current.state.steps.rank).toBeUndefined()
    hook.unmount()
  })
  it.each(['completed', 'aborted', 'failed'])(
    'keeps newer %s status and error when an older activity read resolves last',
    async (status) => {
      let resolve!: (value: unknown) => void
      mocks.read.mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done
          }),
      )
      const hook = renderHook(() => useRecommendProgress({ projectId: 'p', activityId: 'a' }))
      mocks.read.mockResolvedValue({
        data: { recordType: 'products', status, error: 'Newest detail', steps: [] },
      })
      act(() => emit(mocks.api.ws, 'activity:updated', { scope: 'p', activityId: 'a' }))
      await waitFor(() => expect(hook.result.current.error).toBe('Newest detail'))
      const terminalStatus = hook.result.current.status
      await act(async () =>
        resolve({
          data: { recordType: 'products', status: 'running', steps: [{ key: 'gather' }] },
        }),
      )
      expect(hook.result.current.status).toBe(terminalStatus)
      expect(hook.result.current.error).toBe('Newest detail')
      hook.unmount()
    },
  )
  it.each(['activity', 'checkpoint'])(
    'ignores an older %s read failure after a newer refresh succeeds',
    async (stage) => {
      let reject!: (reason: Error) => void
      const pending = new Promise((_, fail) => {
        reject = fail
      })
      if (stage === 'activity') mocks.read.mockImplementationOnce(() => pending)
      else mocks.records.mockImplementationOnce(() => pending)
      const hook = renderHook(() => useRecommendProgress({ projectId: 'p', activityId: 'a' }))
      if (stage === 'checkpoint')
        await waitFor(() => expect(mocks.records).toHaveBeenCalledTimes(1))
      mocks.read.mockResolvedValue({
        data: { recordType: 'products', status: 'completed', steps: [] },
      })
      act(() => emit(mocks.api.ws, 'activity:updated', { scope: 'p', activityId: 'a' }))
      await waitFor(() => expect(hook.result.current.status).toBe('Completed'))
      await act(async () => reject(new Error('Old request failed')))
      expect(hook.result.current.status).toBe('Completed')
      expect(hook.result.current.error).toBeUndefined()
      hook.unmount()
    },
  )
  it('hydrates a persisted checkpoint when opened mid-run', async () => {
    mocks.records.mockResolvedValue({ data: [{ content: checkpoint.progress }] })
    const hook = renderHook(() => useRecommendProgress({ projectId: 'p', activityId: 'a' }))
    await waitFor(() => expect(hook.result.current.state.steps.gather?.items).toHaveLength(1))
    expect(mocks.records).toHaveBeenCalledWith(
      expect.objectContaining({ query: { type: 'products-progress', key: 'a' } }),
    )
    hook.unmount()
  })
})
