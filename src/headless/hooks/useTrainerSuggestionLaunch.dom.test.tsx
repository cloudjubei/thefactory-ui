import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTrainerSuggestionLaunch } from './useTrainerSuggestionLaunch'

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  chat: vi.fn(),
  launch: vi.fn(),
  read: vi.fn(),
}))
vi.mock('../api/ApiContext', () => ({ useOptionalApi: mocks.api }))
vi.mock('../contexts/ChatActionsContext', () => ({ useChatActions: mocks.chat }))
vi.mock('../api/trainerSuggestionsApi', () => ({ launchTrainerSuggestion: mocks.launch }))
vi.mock('../api/generated', () => ({ getActivity: mocks.read }))

type Update = { scope: string; activityId: string }
function socket() {
  const updates = new Set<(event: Update) => void>()
  const reconnects = new Set<() => void>()
  return {
    updates,
    reconnects,
    on: vi.fn((name: string, callback: (event: Update) => void) => {
      expect(name).toBe('activity:updated')
      updates.add(callback)
      return () => {
        updates.delete(callback)
      }
    }),
    onReconnect: vi.fn((callback: () => void) => {
      reconnects.add(callback)
      return () => {
        reconnects.delete(callback)
      }
    }),
    emit(event: Update) {
      updates.forEach((callback) => callback(event))
    },
    reconnect() {
      reconnects.forEach((callback) => callback())
    },
  }
}
const props = { projectId: 'p1', project: 'cartpole', suggestionId: 's1' }
const activity = (status = 'running') => ({
  activityId: 'a1',
  scope: 'p1',
  status,
  steps: [],
  isLive: true,
})
async function settle(action: () => void) {
  await act(async () => {
    action()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  mocks.api.mockReturnValue({ ws: socket() })
  mocks.chat.mockReturnValue({ projectId: 'chat-project' })
  mocks.launch.mockResolvedValue({ activityId: 'a1', queued: true })
  mocks.read.mockResolvedValue({ data: activity() })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('useTrainerSuggestionLaunch mounted integration', () => {
  it('launches only on a press, scopes updates to both project and activity, and refreshes on reconnect', async () => {
    const ws = mocks.api().ws as ReturnType<typeof socket>
    const { result } = renderHook(() => useTrainerSuggestionLaunch(props))
    expect(mocks.launch).not.toHaveBeenCalled()
    expect(mocks.read).not.toHaveBeenCalled()
    await settle(() => result.current.launch())
    expect(mocks.launch).toHaveBeenCalledExactlyOnceWith('p1', 's1', 'cartpole')
    expect(mocks.read).toHaveBeenCalledExactlyOnceWith({
      path: { projectId: 'p1', activityId: 'a1' },
      throwOnError: true,
    })
    await settle(() => {
      ws.emit({ scope: 'p2', activityId: 'a1' })
      ws.emit({ scope: 'p1', activityId: 'other' })
    })
    expect(mocks.read).toHaveBeenCalledTimes(1)
    mocks.read.mockResolvedValue({ data: activity('completed') })
    await settle(() => ws.emit({ scope: 'p1', activityId: 'a1' }))
    expect(result.current.label).toBe('Completed')
    expect(mocks.read).toHaveBeenCalledTimes(2)
    await settle(() => ws.reconnect())
    expect(mocks.read).toHaveBeenCalledTimes(3)
    expect(mocks.launch).toHaveBeenCalledTimes(1)
  })

  it.each(['completed', 'failed', 'aborted'])(
    'polls queued/running work but stops when %s',
    async (status) => {
      mocks.read.mockResolvedValue({ data: activity('queued') })
      const { result } = renderHook(() => useTrainerSuggestionLaunch(props))
      expect(vi.getTimerCount()).toBe(0)
      await settle(() => result.current.launch())
      expect(result.current.label).toBe('Queued')
      mocks.read.mockResolvedValue({ data: activity() })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(result.current.label).toBe('Running')
      expect(mocks.read).toHaveBeenCalledTimes(2)
      mocks.read.mockResolvedValue({ data: activity(status) })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(mocks.read).toHaveBeenCalledTimes(3)
      expect(vi.getTimerCount()).toBe(0)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000)
      })
      expect(mocks.read).toHaveBeenCalledTimes(3)
    },
  )

  it('removes subscriptions and timers on unmount and retains launch protection on remount', async () => {
    const ws = mocks.api().ws as ReturnType<typeof socket>
    const first = renderHook(() => useTrainerSuggestionLaunch(props))
    await settle(() => first.result.current.launch())
    expect(vi.getTimerCount()).toBe(1)
    first.unmount()
    expect(ws.updates.size).toBe(0)
    expect(ws.reconnects.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    const reads = mocks.read.mock.calls.length
    await settle(() => {
      ws.reconnect()
      ws.emit({ scope: 'p1', activityId: 'a1' })
    })
    expect(mocks.read).toHaveBeenCalledTimes(reads)
    const second = renderHook(() => useTrainerSuggestionLaunch(props))
    await settle(() => second.result.current.launch())
    expect(second.result.current.state.activityId).toBe('a1')
    expect(second.result.current.canLaunch).toBe(false)
    expect(mocks.launch).toHaveBeenCalledTimes(1)
    expect(mocks.read).toHaveBeenCalledTimes(reads + 1)
    expect(ws.updates.size).toBe(1)
  })

  it('shares pending launches across mounted peers but isolates suggestions and API sessions', async () => {
    let resolve!: (value: { activityId: string; queued: boolean }) => void
    mocks.launch.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const first = renderHook(() => useTrainerSuggestionLaunch(props))
    const peer = renderHook(() => useTrainerSuggestionLaunch(props))
    await settle(() => {
      first.result.current.launch()
      peer.result.current.launch()
    })
    expect(peer.result.current.state.launching).toBe(true)
    expect(mocks.launch).toHaveBeenCalledTimes(1)
    await settle(() => resolve({ activityId: 'a1', queued: false }))
    expect(peer.result.current.label).toBe('Running')
    const other = renderHook(() => useTrainerSuggestionLaunch({ ...props, suggestionId: 's2' }))
    expect(other.result.current.canLaunch).toBe(true)
    mocks.api.mockReturnValue({ ws: socket() })
    const session = renderHook(() => useTrainerSuggestionLaunch(props))
    expect(session.result.current.canLaunch).toBe(true)
  })

  it('uses chat project fallback and stays inert without an API', async () => {
    const { result, rerender } = renderHook(() =>
      useTrainerSuggestionLaunch({ suggestionId: 's1' }),
    )
    await settle(() => result.current.launch())
    expect(mocks.launch).toHaveBeenCalledWith('chat-project', 's1', undefined)
    mocks.api.mockReturnValue(null)
    rerender()
    expect(result.current.unavailable).toBe(true)
    await settle(() => result.current.launch())
    expect(mocks.launch).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
