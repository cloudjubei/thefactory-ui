import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureBackendClient } from './bootstrap'
import { client } from './generated/client.gen'

type Reply = { status: number; data?: unknown; headers?: Record<string, string> }

/** Answers each request with the next scripted reply, recording the requests it saw. */
function scriptAdapter(replies: Reply[]) {
  const seen: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config)
    const reply = replies.shift() ?? { status: 200, data: {} }
    const response = {
      status: reply.status,
      statusText: String(reply.status),
      data: reply.data,
      headers: reply.headers ?? {},
      config,
    }
    if (reply.status >= 400) {
      throw Object.assign(new Error(`Request failed with status code ${reply.status}`), {
        isAxiosError: true,
        response,
        config,
      })
    }
    return response
  }
  return { adapter, seen }
}

function configure(replies: Reply[]) {
  const callbacks = {
    onUnauthorized: vi.fn(),
    onAuthorized: vi.fn(),
    onStarting: vi.fn(),
  }
  const eject = configureBackendClient({
    baseUrl: 'http://backend:7001/',
    getToken: () => 'tok',
    ...callbacks,
  })
  const script = scriptAdapter(replies)
  client.setConfig({ adapter: script.adapter } as Parameters<typeof client.setConfig>[0])
  return { ...callbacks, ...script, eject }
}

const starting = (projectsDone: number): Reply => ({
  status: 503,
  data: { status: 'starting', searchIndex: { state: 'indexing', projectsDone, projectsTotal: 20 } },
  headers: { 'retry-after': '5' },
})

/** One call through the generated client, as every SDK function makes it. */
const get = () => client.get({ url: '/api/v1/projects', throwOnError: true })

let eject: (() => void) | undefined
afterEach(() => {
  eject?.()
})

describe('configureBackendClient', () => {
  it('reports the progress of a backend that is still starting and rejects the call', async () => {
    const api = configure([starting(7)])
    eject = api.eject

    await expect(get()).rejects.toMatchObject({ response: { status: 503 } })
    expect(api.onStarting).toHaveBeenCalledWith({
      searchIndex: { done: false, projectsDone: 7, projectsTotal: 20 },
    })
    expect(api.seen).toHaveLength(1)
  })

  it('rejects any other 503 without reporting a startup', async () => {
    const api = configure([{ status: 503, data: { error: 'down' } }])
    eject = api.eject

    await expect(get()).rejects.toMatchObject({ response: { status: 503 } })
    expect(api.onStarting).not.toHaveBeenCalled()
  })

  it('reports an unauthorized response and rejects it', async () => {
    const api = configure([{ status: 401 }])
    eject = api.eject

    await expect(get()).rejects.toMatchObject({ response: { status: 401 } })
    expect(api.onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('reports a successful response as authorized and sends the bearer', async () => {
    const api = configure([{ status: 200 }])
    eject = api.eject

    await get()

    expect(api.onAuthorized).toHaveBeenCalledTimes(1)
    expect(api.seen[0].headers.get('Authorization')).toBe('Bearer tok')
  })
})
