import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, Set<(data: unknown) => void>>()
  const ws = {
    on: (event: string, handler: (data: unknown) => void) => {
      const set = handlers.get(event) ?? new Set()
      handlers.set(event, set)
      set.add(handler)
      return () => {
        set.delete(handler)
      }
    },
    onReconnect: () => () => {},
  }
  return {
    ws,
    emit: (event: string, data: unknown) => handlers.get(event)?.forEach((h) => h(data)),
    refresh: vi.fn(async () => {}),
    startCliSignIn: vi.fn(),
    close: vi.fn(async () => {}),
  }
})

vi.mock('../api/ApiContext', () => ({ useApi: () => ({ ws: mocks.ws, wsState: 'open' }) }))
vi.mock('../contexts/CliConfigsContext', () => ({
  useCliConfigs: () => ({ refresh: mocks.refresh }),
}))
vi.mock('../api/cliSignInApi', () => ({ startCliSignIn: mocks.startCliSignIn }))
vi.mock('../api/signInSessionsApi', () => ({
  SIGN_IN_SESSION_ROUTES: { close: mocks.close, list: async () => [] },
}))

import { SIGN_IN_SESSIONS_EVENT } from '../utils/signInSessionConstants'
import { useCliSignIn } from './useCliSignIn'
import { signInSessionsStoreFor } from './useSignInSession'

const SESSION: SignInSessionState = {
  id: 'cli-s1',
  kind: 'cli-login',
  subject: 'codex',
  title: 'Sign in to Codex',
  status: 'open',
  surface: { kind: 'prompt', code: 'ABCD-1234' },
  startedAt: '2026-11-27T12:00:00.000Z',
  expiresAt: '2026-11-27T12:15:00.000Z',
}

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.startCliSignIn.mockResolvedValue(SESSION)
})

describe('useCliSignIn', () => {
  it('shows the session it started in the app’s sign-in view', async () => {
    const { result } = renderHook(() => useCliSignIn())
    act(() => result.current.start({ cli: 'codex', label: 'Codex' }))
    expect(result.current.starting).toBe(true)
    await waitFor(() => expect(result.current.starting).toBe(false))
    expect(mocks.startCliSignIn).toHaveBeenCalledWith({ cli: 'codex', label: 'Codex' })
    expect(signInSessionsStoreFor(mocks.ws as never).snapshot().shown).toEqual(SESSION)
    expect(result.current.pending).toEqual({ cli: 'codex', label: 'Codex' })
  })

  it('reads the logins again and tells its caller once signed in', async () => {
    const onSignedIn = vi.fn()
    const { result } = renderHook(() => useCliSignIn(onSignedIn))
    act(() => result.current.start({ cli: 'codex', label: 'Codex' }))
    await waitFor(() => expect(result.current.starting).toBe(false))
    act(() => mocks.emit(SIGN_IN_SESSIONS_EVENT, { session: { ...SESSION, status: 'finished' } }))
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(onSignedIn).toHaveBeenCalledTimes(1)
    expect(result.current.pending).toBeUndefined()
  })

  it('closes its session through the sign-in session routes when stopped', async () => {
    mocks.startCliSignIn.mockResolvedValue({ ...SESSION, id: 'cli-s2' })
    const { result } = renderHook(() => useCliSignIn())
    act(() => result.current.start({ cli: 'codex', label: 'Codex' }))
    await waitFor(() => expect(result.current.starting).toBe(false))
    await act(() => result.current.stop())
    expect(mocks.close).toHaveBeenCalledWith('cli-s2')
  })
})
