import type { ReactNode } from 'react'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../../../headless/api/AuthContext'
import { configureBackendClient } from '../../../headless/api/bootstrap'
import { client } from '../../../headless/api/generated/client.gen'
import { useChatMessagingSetting } from '../../../headless/hooks/useChatMessagingSetting'
import ChatMessagingSetting from './ChatMessagingSetting'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => (resolve = done))
  return { promise, resolve }
}

let sessionNumber = 0
let token: string | null
let requests: InternalAxiosRequestConfig[]
let saved: boolean
let readGate: ReturnType<typeof deferred> | undefined
let writeGate: ReturnType<typeof deferred> | undefined
let failWrite: boolean
let eject: () => void
let originalConfig: ReturnType<typeof client.getConfig>

const storage = {
  read: () => token,
  write: (next: string | null) => {
    token = next
  },
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider storage={storage}>{children}</AuthProvider>
}

function controls() {
  return (
    <>
      <ChatMessagingSetting />
      <ChatMessagingSetting />
    </>
  )
}

function expectControls(allowed: boolean, disabled = false) {
  const switches = screen.getAllByRole('switch')
  expect(switches).toHaveLength(2)
  for (const control of switches) {
    expect(control.getAttribute('aria-checked')).toBe(String(allowed))
    expect((control as HTMLButtonElement).disabled).toBe(disabled)
  }
}

const reads = () => requests.filter((request) => request.method?.toUpperCase() === 'GET')
const writes = () => requests.filter((request) => request.method?.toUpperCase() === 'PUT')

beforeEach(() => {
  // The hook deliberately keeps stores across mounts; give each test a distinct session.
  token = `messaging-dom-${++sessionNumber}`
  requests = []
  saved = false
  readGate = undefined
  writeGate = undefined
  failWrite = false
  originalConfig = client.getConfig()
  eject = configureBackendClient({
    baseUrl: 'http://messaging.test',
    getToken: () => token,
    onUnauthorized: vi.fn(),
    onAuthorized: vi.fn(),
    onStarting: vi.fn(),
  })
  // Keep the actual generated GET/PUT functions and bootstrap interceptors in the path.
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config)
    expect(config.url).toBe('http://messaging.test/api/v1/settings/chatMessaging')
    expect(config.headers.get('Authorization')).toBe(`Bearer ${token}`)
    const method = config.method?.toUpperCase()
    expect(['GET', 'PUT']).toContain(method)
    if (method === 'GET') await readGate?.promise
    else {
      await writeGate?.promise
      if (failWrite) throw new Error('offline')
      const body = JSON.parse(config.data)
      expect(body).toEqual({ value: { allowWithoutAsking: expect.any(Boolean) } })
      saved = body.value.allowWithoutAsking
    }
    return {
      data: { value: { allowWithoutAsking: saved } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }
  client.setConfig({ adapter })
})

afterEach(() => {
  cleanup()
  eject()
  client.setConfig(originalConfig)
})

describe('mounted chat messaging setting', () => {
  it('shares one load and notifies both controls on saves without loading again on rerenders', async () => {
    readGate = deferred()
    const view = render(controls(), { wrapper })
    expectControls(false, true)
    await waitFor(() => expect(reads()).toHaveLength(1))
    await act(async () => readGate!.resolve())
    expectControls(false)

    writeGate = deferred()
    fireEvent.click(screen.getAllByRole('switch')[0])
    expectControls(false, true)
    await waitFor(() => expect(writes()).toHaveLength(1))
    view.rerender(controls())
    expectControls(false, true)
    expect(reads()).toHaveLength(1)
    await act(async () => writeGate!.resolve())
    expectControls(true)

    fireEvent.click(screen.getAllByRole('switch')[1])
    await waitFor(() => expectControls(false))
    expect(writes()).toHaveLength(2)
    expect(JSON.parse(writes()[0].data)).toEqual({ value: { allowWithoutAsking: true } })
    expect(JSON.parse(writes()[1].data)).toEqual({ value: { allowWithoutAsking: false } })
    view.rerender(controls())
    expect(reads()).toHaveLength(1)
  })

  it('retains the confirmed value and shows the failure in both controls, then permits another save', async () => {
    saved = true
    render(controls(), { wrapper })
    await waitFor(() => expectControls(true))
    failWrite = true
    fireEvent.click(screen.getAllByRole('switch')[1])
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2))
    expectControls(true)
    for (const alert of screen.getAllByRole('alert')) {
      expect(alert.textContent).toContain('The messaging setting could not be saved. Try again.')
    }
    expect(reads()).toHaveLength(1)
    expect(saved).toBe(true)

    failWrite = false
    fireEvent.click(screen.getAllByRole('switch')[0])
    await waitFor(() => expectControls(false))
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(writes()).toHaveLength(2)
    expect(reads()).toHaveLength(1)
  })

  it('revalidates on remount and isolates signed-out and new-auth sessions', async () => {
    saved = true
    const first = renderHook(useChatMessagingSetting, { wrapper })
    await waitFor(() => expect(first.result.current.allowed).toBe(true))
    first.unmount()
    saved = false
    const mounted = renderHook(() => ({ setting: useChatMessagingSetting(), auth: useAuth() }), {
      wrapper,
    })
    await waitFor(() => expect(mounted.result.current.setting.allowed).toBe(false))
    expect(reads()).toHaveLength(2)
    act(() => mounted.result.current.auth.clearToken())
    expect(mounted.result.current.setting).toMatchObject({ allowed: false, ready: false })
    expect(reads()).toHaveLength(2)

    saved = true
    act(() => mounted.result.current.auth.setToken(`messaging-dom-${++sessionNumber}`))
    await waitFor(() => expect(mounted.result.current.setting.allowed).toBe(true))
    expect(reads()).toHaveLength(3)
    mounted.rerender()
    expect(reads()).toHaveLength(3)
    expect(writes()).toHaveLength(0)
  })
})
