import { createHash } from 'node:crypto'
import { connect, type Socket } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeBackendServer } from './FakeBackendServer'
import type { FakeRoute } from './fakeBackendTypes'

const TOKEN = 'fake-token'
const AUTH = { Authorization: `Bearer ${TOKEN}` }
const WS_KEY = 'dGhlIHNhbXBsZSBub25jZQ=='
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const ROUTES: FakeRoute[] = [
  { method: 'GET', path: '/api/v1/items', answer: ({ query }) => ({ kind: query.get('kind') }) },
  { method: 'POST', path: '/api/v1/echo', answer: ({ body }) => body },
]

const started: FakeBackendServer[] = []
const sockets: Socket[] = []

async function start(log?: (line: string) => void): Promise<FakeBackendServer> {
  const server = new FakeBackendServer({ token: TOKEN, routes: ROUTES, ...(log ? { log } : {}) })
  started.push(server)
  await server.start()
  return server
}

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  await Promise.all(started.splice(0).map((server) => server.stop()))
})

function openSocket(server: FakeBackendServer, path: string): Promise<{ text: () => string }> {
  return new Promise((resolve, reject) => {
    let received = Buffer.alloc(0)
    const socket = connect(server.port, '127.0.0.1', () => {
      socket.write(
        [
          `GET ${path} HTTP/1.1`,
          'Host: 127.0.0.1',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Key: ${WS_KEY}`,
          'Sec-WebSocket-Version: 13',
          '',
          '',
        ].join('\r\n'),
      )
    })
    sockets.push(socket)
    socket.on('error', reject)
    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk])
      if (received.includes('\r\n\r\n')) resolve({ text: () => received.toString('latin1') })
    })
    socket.on('close', () => resolve({ text: () => received.toString('latin1') }))
  })
}

describe('FakeBackendServer', () => {
  it('listens on the loopback address only', async () => {
    const server = await start()
    expect(server.url).toBe(`http://127.0.0.1:${server.port}`)
    expect(server.address).toBe('127.0.0.1')
  })

  it('answers at / with no token, which is what a launcher polls', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/`)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ fakeBackend: true })
  })

  it('answers a read as JSON and hands it the query', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/api/v1/items?kind=a`, { headers: AUTH })
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(await res.json()).toEqual({ kind: 'a' })
  })

  it('hands a POST its JSON body', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/api/v1/echo`, {
      method: 'POST',
      headers: { ...AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { type: 'PROJECT' } }),
    })
    expect(await res.json()).toEqual({ context: { type: 'PROJECT' } })
  })

  it('answers a POST that carries no body', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/api/v1/echo`, { method: 'POST', headers: AUTH })
    expect(res.status).toBe(200)
  })

  it('answers a body that is not JSON as an error naming the route, and stays up', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/api/v1/echo`, {
      method: 'POST',
      headers: AUTH,
      body: '{not json',
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ route: 'POST /api/v1/echo' })
    expect((await fetch(`${server.url}/`)).status).toBe(200)
  })

  it('refuses a read with no token', async () => {
    const server = await start()
    expect((await fetch(`${server.url}/api/v1/items`)).status).toBe(401)
  })

  it('names an unknown route in its answer and in its log', async () => {
    const log = vi.fn()
    const server = await start(log)
    const res = await fetch(`${server.url}/api/v1/nope?x=1`, { headers: AUTH })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ route: 'GET /api/v1/nope' })
    expect(log).toHaveBeenCalledWith(expect.stringContaining('GET /api/v1/nope'))
  })

  it('logs nothing for a request it answered', async () => {
    const log = vi.fn()
    const server = await start(log)
    await fetch(`${server.url}/api/v1/items`, { headers: AUTH })
    expect(log).not.toHaveBeenCalled()
  })

  it('never logs the token', async () => {
    const log = vi.fn()
    const server = await start(log)
    await fetch(`${server.url}/api/v1/nope`, { headers: AUTH })
    expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN)
  })

  it('answers a browser preflight from another origin', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/api/v1/items`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('access-control-allow-headers')).toBe('authorization,content-type')
    expect(res.headers.get('access-control-allow-methods')).toContain('POST')
  })

  it('allows the headers the clients send when a preflight names none', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/api/v1/items`, { method: 'OPTIONS' })
    expect(res.headers.get('access-control-allow-headers')).toContain('authorization')
  })

  it('lets a browser read an error from another origin', async () => {
    const server = await start()
    const res = await fetch(`${server.url}/api/v1/nope`, { headers: AUTH })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('accepts the app socket with the handshake a browser checks', async () => {
    const server = await start()
    const { text } = await openSocket(server, `/ws?token=${TOKEN}`)
    const accept = createHash('sha1')
      .update(WS_KEY + WS_GUID)
      .digest('base64')
    expect(text()).toContain('HTTP/1.1 101')
    expect(text()).toContain(`Sec-WebSocket-Accept: ${accept}`)
  })

  it('greets the socket as the real backend does', async () => {
    const server = await start()
    const { text } = await openSocket(server, '/ws')
    await vi.waitFor(() => expect(text()).toContain('"type":"connected"'))
  })

  it('ends the socket when the client sends a close frame', async () => {
    const server = await start()
    await openSocket(server, '/ws')
    const socket = sockets.at(-1)
    const closed = new Promise((resolve) => socket?.once('close', resolve))
    socket?.write(Buffer.from([0x88, 0x80, 0x01, 0x02, 0x03, 0x04]))
    await expect(closed).resolves.toBeDefined()
  })

  it('keeps the socket through any other frame', async () => {
    const server = await start()
    await openSocket(server, '/ws')
    const socket = sockets.at(-1)
    socket?.write(Buffer.from([0x81, 0x80, 0x01, 0x02, 0x03, 0x04]))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(socket?.destroyed).toBe(false)
  })

  it('refuses a socket anywhere else, naming the path', async () => {
    const log = vi.fn()
    const server = await start(log)
    const { text } = await openSocket(server, '/api/v1/ws')
    expect(text()).toContain('HTTP/1.1 404')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('/api/v1/ws'))
  })

  it('stops with a socket still open', async () => {
    const server = await start()
    await openSocket(server, '/ws')
    await server.stop()
    await expect(fetch(`${server.url}/`)).rejects.toThrow()
  })

  it('stopping twice is safe', async () => {
    const server = await start()
    await server.stop()
    await expect(server.stop()).resolves.toBeUndefined()
  })

  it('fails to start on a port already taken, saying so', async () => {
    const first = await start()
    const second = new FakeBackendServer({ token: TOKEN, routes: ROUTES, port: first.port })
    await expect(second.start()).rejects.toThrow(/EADDRINUSE/)
  })
})
