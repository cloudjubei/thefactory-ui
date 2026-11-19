import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { AxiosHeaders, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteCliAuthCache,
  listCliAgentSubscriptionWindows,
  listCliAuthCaches,
} from '../api/generated'
import type { CliAgentSubscriptionWindowEntry } from '../api/generated'
import { CliConfigsProvider, useCliConfigs } from './CliConfigsContext'

vi.mock('../api', () => {
  const ws = { on: () => () => {} }
  return {
    useApi: () => ({ ws, wsState: 'open' }),
    useAuth: () => ({ token: 'test' }),
  }
})

vi.mock('../api/generated', () => ({
  listCliAuthCaches: vi.fn(),
  deleteCliAuthCache: vi.fn(async () => ({})),
  getActiveCliState: vi.fn(async () => ({ data: { activeCli: 'codex' } })),
  listCliAgentSubscriptionWindows: vi.fn(),
  listCliCapabilityScorecards: vi.fn(async () => ({ data: [] })),
  listCliImageVersions: vi.fn(async () => ({ data: { images: [], docker: 'missing' } })),
}))

const windows = vi.mocked(listCliAgentSubscriptionWindows)
const caches = vi.mocked(listCliAuthCaches)
const credential = {
  id: 'codex-login',
  cli: 'codex',
  name: 'Codex login',
  fileNames: [],
  createdAt: '2026-11-18T00:00:00Z',
  updatedAt: '2026-11-18T00:00:00Z',
}
const snapshot: CliAgentSubscriptionWindowEntry = {
  cli: 'codex',
  credentialId: credential.id,
  runId: 'latest-run',
  subscription: { windows: [{ usedPercent: 62, windowMinutes: 300, resetsAt: 1795050000 }] },
}

function response<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

afterEach(cleanup)

describe('CLI credential refresh and advisory plan windows', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    caches.mockResolvedValue(response([credential]))
    windows.mockResolvedValue(response([]))
  })

  it('loads credentials and active CLI before the advisory response arrives', async () => {
    const advisory = deferred<AxiosResponse<CliAgentSubscriptionWindowEntry[]>>()
    windows.mockReturnValueOnce(advisory.promise)

    const { result } = renderHook(useCliConfigs, { wrapper: CliConfigsProvider })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.caches).toEqual([credential])
    expect(result.current.activeCli).toBe('codex')
    expect(result.current.subscriptionWindows).toEqual([])

    await act(async () => advisory.resolve(response([snapshot])))
    expect(result.current.subscriptionWindows).toEqual([snapshot])
  })

  it('completes a credential deletion while the advisory refresh is still pending', async () => {
    const { result } = renderHook(useCliConfigs, { wrapper: CliConfigsProvider })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    const advisory = deferred<AxiosResponse<CliAgentSubscriptionWindowEntry[]>>()
    windows.mockReturnValueOnce(advisory.promise)
    caches.mockResolvedValueOnce(response([]))

    const completed = vi.fn()
    await act(async () => {
      void result.current.deleteCache(credential.id).then(completed)
    })
    expect(deleteCliAuthCache).toHaveBeenCalledWith({
      path: { id: credential.id },
      throwOnError: true,
    })
    expect(completed).toHaveBeenCalledOnce()
    expect(result.current.caches).toEqual([])

    await act(async () => advisory.reject(new Error('Window endpoint unavailable')))
    expect(result.current.subscriptionWindowsError).toBe('Could not load plan windows.')
    expect(result.current.loadError).toBeNull()
  })

  it('does not let an older advisory response overwrite a newer refresh', async () => {
    const older = deferred<AxiosResponse<CliAgentSubscriptionWindowEntry[]>>()
    windows.mockReturnValueOnce(older.promise).mockResolvedValueOnce(response([snapshot]))
    const { result } = renderHook(useCliConfigs, { wrapper: CliConfigsProvider })

    await act(async () => result.current.refresh())
    expect(result.current.subscriptionWindows).toEqual([snapshot])

    await act(async () => older.resolve(response([{ ...snapshot, runId: 'older-run' }])))
    expect(result.current.subscriptionWindows).toEqual([snapshot])
  })
})
