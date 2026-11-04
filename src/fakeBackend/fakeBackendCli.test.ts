import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FakeBackendServer } from './FakeBackendServer'
import { startFakeBackendCli } from './fakeBackendCli'

const started: FakeBackendServer[] = []

async function start(argv: string[], env: Record<string, string | undefined>) {
  const log = vi.fn()
  const server = await startFakeBackendCli(argv, env, log)
  started.push(server)
  return { server, log }
}

afterEach(async () => {
  await Promise.all(started.splice(0).map((server) => server.stop()))
})

describe('startFakeBackendCli', () => {
  it('listens on the port it is told, on the loopback address', async () => {
    const free = await start([], {})
    const { port } = free.server
    await free.server.stop()
    const { server } = await start([], { PORT: String(port) })
    expect(server.url).toBe(`http://127.0.0.1:${port}`)
  })

  it('serves the route table with the token it is told', async () => {
    const argv = ['--token-env', 'VITE_BEARER_TOKEN']
    const { server } = await start(argv, { VITE_BEARER_TOKEN: 'fake-told' })
    const res = await fetch(`${server.url}/api/v1/projects`, {
      headers: { Authorization: 'Bearer fake-told' },
    })
    expect(res.status).toBe(200)
  })

  it('says where it listens', async () => {
    const { server, log } = await start([], {})
    expect(log).toHaveBeenCalledWith(expect.stringContaining(server.url))
  })

  it('keeps a token it was told out of its output', async () => {
    const { log } = await start(['--token-env', 'T'], { T: 'fake-told' })
    expect(JSON.stringify(log.mock.calls)).not.toContain('fake-told')
  })

  it('prints a token it made up, or nothing could sign in', async () => {
    const { log } = await start([], {})
    expect(JSON.stringify(log.mock.calls)).toMatch(/fake-[0-9a-f-]{36}/)
  })

  it('makes up a different token each run', async () => {
    const first = await start([], {})
    const second = await start([], {})
    expect(first.log.mock.calls).not.toEqual(second.log.mock.calls)
  })

  it('refuses to start on what may be a real token', async () => {
    await expect(startFakeBackendCli(['--token-env', 'T'], { T: 'real' }, vi.fn())).rejects.toThrow(
      /may be a real token/,
    )
  })

  it('logs a route it could not answer', async () => {
    const { server, log } = await start([], {})
    await fetch(`${server.url}/api/v1/nope`)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('GET /api/v1/nope'))
  })
})
