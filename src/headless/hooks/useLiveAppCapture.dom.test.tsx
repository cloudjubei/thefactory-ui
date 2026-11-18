import { createRef } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectAppViewHandle } from '../utils/appCapture'

const transport = vi.hoisted(() => ({
  handlers: new Set<(data: unknown) => void>(),
  post: vi.fn(),
}))
vi.mock('../api/ApiContext', () => ({
  useOptionalApi: () => ({
    ws: {
      on: (topic: string, handler: (data: unknown) => void) => {
        expect(topic).toBe('appView:capture-requested')
        transport.handlers.add(handler)
        return () => transport.handlers.delete(handler)
      },
    },
  }),
}))
vi.mock('../api/generated/client.gen', () => ({ client: { post: transport.post } }))
import { useLiveAppCapture } from './useLiveAppCapture'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  transport.handlers.clear()
})

function emit(data: unknown) {
  for (const handler of transport.handlers) handler(data)
}

describe('useLiveAppCapture', () => {
  it('filters project, deduplicates and uploads live HTML through the authenticated client', async () => {
    const view = createRef<ProjectAppViewHandle>()
    const captureHtml = vi.fn().mockResolvedValue('<html>edited view</html>')
    view.current = { captureHtml }
    const { unmount } = renderHook(() => useLiveAppCapture('project/id', view))
    await act(async () => {
      emit({ projectId: 'other', requestId: 'wrong' })
      emit({ projectId: 'project/id', requestId: 'request/id' })
      emit({ projectId: 'project/id', requestId: 'request/id' })
    })
    expect(captureHtml).toHaveBeenCalledTimes(1)
    expect(transport.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/v1/projects/project%2Fid/view/captures/request%2Fid',
        body: { html: '<html>edited view</html>' },
        throwOnError: true,
      }),
    )
    unmount()
    expect(transport.handlers.size).toBe(0)
  })

  it('returns a safe error on capture failure and handles upload rejection', async () => {
    transport.post.mockRejectedValueOnce(new Error('expired'))
    const view = createRef<ProjectAppViewHandle>()
    view.current = { captureHtml: vi.fn().mockRejectedValue(new Error('secret signed URL')) }
    renderHook(() => useLiveAppCapture('p', view))
    await act(async () => {
      emit({ projectId: 'p', requestId: 'r' })
    })
    expect(transport.post.mock.calls[0][0].body).toEqual({
      error: expect.stringContaining('could not capture'),
    })
    expect(JSON.stringify(transport.post.mock.calls)).not.toContain('secret')
  })

  it('does not upload a late capture after unmount', async () => {
    let finish!: (html: string) => void
    const view = createRef<ProjectAppViewHandle>()
    view.current = {
      captureHtml: () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    }
    const { unmount } = renderHook(() => useLiveAppCapture('p', view))
    act(() => {
      emit({ projectId: 'p', requestId: 'r' })
    })
    unmount()
    await act(async () => {
      finish('stale')
    })
    expect(transport.post).not.toHaveBeenCalled()
  })
})
