import { createHash } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import {
  FAKE_BACKEND_ALLOWED_HEADERS,
  FAKE_BACKEND_ALLOWED_METHODS,
  FAKE_BACKEND_BAD_BODY_CODE,
  FAKE_BACKEND_HOST,
  FAKE_BACKEND_VERSION,
  FAKE_BACKEND_WS_CLOSE_OPCODE,
  FAKE_BACKEND_WS_GUID,
  FAKE_BACKEND_WS_PATH,
  FAKE_BACKEND_WS_TEXT_FRAME,
} from './fakeBackendConstants'
import type { FakeAnswer, FakeBackendServerOptions } from './fakeBackendTypes'
import { answerFakeRequest } from './fakeBackendUtils'

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : undefined
}

function textFrame(text: string): Buffer {
  const payload = Buffer.from(text)
  return Buffer.concat([Buffer.from([FAKE_BACKEND_WS_TEXT_FRAME, payload.length]), payload])
}

/**
 * The fake backend: the API the clients read, from fixtures, on the loopback
 * address. Its socket only says hello: nothing happens here to broadcast, and
 * it is there so the apps do not show themselves disconnected.
 */
export class FakeBackendServer {
  private readonly _options: FakeBackendServerOptions
  private readonly _server: Server
  private readonly _sockets = new Set<Duplex>()
  private _port = 0

  constructor(options: FakeBackendServerOptions) {
    this._options = options
    this._server = createServer((request, response) => void this._onRequest(request, response))
    this._server.on('upgrade', (request, socket) => this._onUpgrade(request, socket))
  }

  get port(): number {
    return this._port
  }

  get address(): string {
    const bound = this._server.address()
    return bound && typeof bound === 'object' ? bound.address : ''
  }

  get url(): string {
    return `http://${FAKE_BACKEND_HOST}:${this._port}`
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._server.once('error', reject)
      this._server.listen(this._options.port ?? 0, FAKE_BACKEND_HOST, () => {
        this._server.off('error', reject)
        resolve()
      })
    })
    const address = this._server.address()
    if (address && typeof address === 'object') this._port = address.port
  }

  async stop(): Promise<void> {
    for (const socket of this._sockets) socket.destroy()
    this._server.closeAllConnections()
    await new Promise((resolve) => this._server.close(resolve))
  }

  private async _onRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? '/', this.url)
    const method = request.method ?? 'GET'
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', FAKE_BACKEND_ALLOWED_METHODS)
      response.setHeader(
        'Access-Control-Allow-Headers',
        request.headers['access-control-request-headers'] ?? FAKE_BACKEND_ALLOWED_HEADERS,
      )
      response.writeHead(204).end()
      return
    }
    const answer = await this._answer(request, method, url)
    if (answer.status >= 400) this._log(answer)
    response.writeHead(answer.status, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(answer.body))
  }

  private async _answer(request: IncomingMessage, method: string, url: URL): Promise<FakeAnswer> {
    if (url.pathname === '/') {
      return { status: 200, body: { fakeBackend: true, version: FAKE_BACKEND_VERSION } }
    }
    let body: unknown
    try {
      body = await readJsonBody(request)
    } catch (err) {
      const route = `${method} ${url.pathname}`
      const why = err instanceof Error ? err.message : String(err)
      return {
        status: 400,
        body: {
          error: `The fake backend could not read the body of ${route}: ${why}`,
          code: FAKE_BACKEND_BAD_BODY_CODE,
          route,
        },
      }
    }
    return answerFakeRequest(
      {
        method,
        pathname: url.pathname,
        query: url.searchParams,
        authorization: request.headers.authorization,
        body,
      },
      this._options,
    )
  }

  private _onUpgrade(request: IncomingMessage, socket: Duplex): void {
    const { pathname } = new URL(request.url ?? '/', this.url)
    if (pathname !== FAKE_BACKEND_WS_PATH) {
      const error = `The fake backend has no socket at ${pathname}.`
      this._options.log?.(error)
      socket.end(`HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n${error}`)
      return
    }
    const accept = createHash('sha1')
      .update(`${request.headers['sec-websocket-key']}${FAKE_BACKEND_WS_GUID}`)
      .digest('base64')
    this._sockets.add(socket)
    socket.on('close', () => this._sockets.delete(socket))
    socket.on('error', () => socket.destroy())
    socket.on('data', (frame: Buffer) => {
      if (((frame[0] ?? 0) & 0x0f) === FAKE_BACKEND_WS_CLOSE_OPCODE) socket.end()
    })
    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        '',
        '',
      ].join('\r\n'),
    )
    socket.write(
      textFrame(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })),
    )
  }

  private _log({ body }: FakeAnswer): void {
    const { error } = body as { error?: string }
    if (error) this._options.log?.(error)
  }
}
