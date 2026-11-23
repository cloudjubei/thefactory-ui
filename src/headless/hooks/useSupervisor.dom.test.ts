import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkQueueScope } from 'thefactory-tools/types'
import type { SupervisorRecord } from '../utils/supervisorPanelTypes'

const api = vi.hoisted(() => ({ read: vi.fn(), set: vi.fn(), stops: vi.fn() }))
vi.mock('../api/supervisorApi', () => ({
  readSupervisor: api.read,
  switchSupervisor: api.set,
  readScopeStops: api.stops,
}))

import { useSupervisor } from './useSupervisor'

const SCOPE: WorkQueueScope = { kind: 'group', groupId: 'factory' }
const OFF: SupervisorRecord = { scope: SCOPE, enabled: false, actions: [] }
const ON: SupervisorRecord = { ...OFF, enabled: true }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

async function mounted(record: SupervisorRecord = OFF, onError = vi.fn()) {
  api.read.mockResolvedValue(record)
  api.stops.mockResolvedValue([])
  const hook = renderHook(() => useSupervisor(SCOPE, { onError }))
  await waitFor(() => expect(hook.result.current.view).toBeDefined())
  return { ...hook, onError }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useSupervisor', () => {
  it('reads the scope’s supervisor and its stops', async () => {
    const { result } = await mounted()
    expect(api.read).toHaveBeenCalledWith(SCOPE)
    expect(api.stops).toHaveBeenCalledWith(SCOPE)
    expect(result.current.view?.enabled).toBe(false)
  })

  it('switches on at once, sends it, and keeps the record the server answers', async () => {
    const answer = deferred<SupervisorRecord>()
    api.set.mockReturnValue(answer.promise)
    const { result } = await mounted()
    act(() => result.current.setEnabled(true))
    expect(result.current.view?.enabled).toBe(true)
    expect(api.set).toHaveBeenCalledWith(SCOPE, true)
    await act(async () => answer.resolve(ON))
    expect(result.current.view?.enabled).toBe(true)
  })

  it('switches off from on', async () => {
    api.set.mockResolvedValue(OFF)
    const { result } = await mounted(ON)
    await act(async () => result.current.toggle())
    expect(api.set).toHaveBeenCalledWith(SCOPE, false)
    expect(result.current.view?.enabled).toBe(false)
  })

  it('sends nothing when it is already where it is asked to be', async () => {
    const { result } = await mounted(ON)
    act(() => result.current.setEnabled(true))
    expect(api.set).not.toHaveBeenCalled()
  })

  it('takes a refused switch back and says why', async () => {
    const answer = deferred<SupervisorRecord>()
    api.set.mockReturnValue(answer.promise)
    const { result, onError } = await mounted()
    act(() => result.current.setEnabled(true))
    await act(async () => answer.reject(new Error('Nope')))
    expect(result.current.view?.enabled).toBe(false)
    expect(onError).toHaveBeenCalledWith('Nope')
  })

  it('reads nothing without a scope', () => {
    const { result } = renderHook(() => useSupervisor(undefined))
    expect(api.read).not.toHaveBeenCalled()
    expect(result.current.view).toBeUndefined()
  })
})
