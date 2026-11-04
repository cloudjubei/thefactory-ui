import {
  FAKE_BACKEND_DEFAULT_PORT_ENV,
  FAKE_BACKEND_DEFAULT_TOKEN_ENV,
  FAKE_BACKEND_FAILED_CODE,
  FAKE_BACKEND_NO_RECORD_CODE,
  FAKE_BACKEND_TOKEN_PREFIX,
  FAKE_BACKEND_UNAUTHORIZED_CODE,
  FAKE_BACKEND_UNKNOWN_ROUTE_CODE,
} from './fakeBackendConstants'
import type {
  FakeAnswer,
  FakeAnswerContext,
  FakeBackendOptions,
  FakeHttpRequest,
  FakeRoute,
  FakeRouteMatch,
} from './fakeBackendTypes'

const MAX_PORT = 65_535

class FakeRecordMissing extends Error {}

function matchPath(pattern: string, pathname: string): Record<string, string> | undefined {
  const wanted = pattern.split('/')
  const actual = pathname.split('/')
  if (wanted.length !== actual.length) return undefined
  const params: Record<string, string> = {}
  for (const [index, segment] of wanted.entries()) {
    const value = actual[index] ?? ''
    if (!segment.startsWith('{')) {
      if (segment !== value) return undefined
    } else {
      if (!value) return undefined
      params[segment.slice(1, -1)] = decodeURIComponent(value)
    }
  }
  return params
}

/** The route for a request. A literal segment beats a parameter, as on the real router. */
export function matchFakeRoute(
  routes: readonly FakeRoute[],
  method: string,
  pathname: string,
): FakeRouteMatch | undefined {
  let best: FakeRouteMatch | undefined
  for (const route of routes) {
    if (route.method !== method) continue
    const params = matchPath(route.path, pathname)
    if (!params) continue
    if (!best || Object.keys(params).length < Object.keys(best.params).length) {
      best = { route, params }
    }
  }
  return best
}

export function bearerTokenOf(authorization: string | undefined): string | undefined {
  const [scheme, token] = (authorization ?? '').split(' ')
  return scheme?.toLowerCase() === 'bearer' ? token : undefined
}

export function isThrowawayFakeToken(token: string): boolean {
  return (
    token.startsWith(FAKE_BACKEND_TOKEN_PREFIX) && token.length > FAKE_BACKEND_TOKEN_PREFIX.length
  )
}

function refusal(status: number, code: string, route: string, error: string): FakeAnswer {
  return { status, body: { error, code, route } }
}

/** Answers one request from the route table; a request it cannot answer says which it was. */
export function answerFakeRequest(
  request: FakeHttpRequest,
  { routes, token }: FakeAnswerContext,
): FakeAnswer {
  const { method, pathname, query, body } = request
  const named = `${method} ${pathname}`
  const match = matchFakeRoute(routes, method, pathname)
  if (!match) {
    return refusal(
      404,
      FAKE_BACKEND_UNKNOWN_ROUTE_CODE,
      named,
      `The fake backend has no route for ${named}. Add it to src/fakeBackend/fakeBackendRoutes.ts in thefactory-ui.`,
    )
  }
  if (!match.route.isPublic && bearerTokenOf(request.authorization) !== token) {
    return refusal(
      401,
      FAKE_BACKEND_UNAUTHORIZED_CODE,
      named,
      `The fake backend takes only its own throwaway token, on ${named}.`,
    )
  }
  try {
    const answer = match.route.answer({
      params: match.params,
      query,
      body,
      missing: (message) => {
        throw new FakeRecordMissing(message)
      },
    })
    return { status: 200, body: answer }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return err instanceof FakeRecordMissing
      ? refusal(404, FAKE_BACKEND_NO_RECORD_CODE, named, `${message} (${named})`)
      : refusal(
          500,
          FAKE_BACKEND_FAILED_CODE,
          named,
          `The fake backend failed on ${named}: ${message}`,
        )
  }
}

function readFlags(argv: readonly string[]): { portEnv: string; tokenEnv: string } {
  const flags = {
    portEnv: FAKE_BACKEND_DEFAULT_PORT_ENV,
    tokenEnv: FAKE_BACKEND_DEFAULT_TOKEN_ENV,
  }
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (flag !== '--port-env' && flag !== '--token-env') {
      throw new Error(`The fake backend takes only --port-env and --token-env, not ${flag}.`)
    }
    if (!value) throw new Error(`${flag} names the variable to read, and none was given.`)
    if (flag === '--port-env') flags.portEnv = value
    else flags.tokenEnv = value
  }
  return flags
}

function readPort(name: string, value: string | undefined): number {
  if (value === undefined) return 0
  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > MAX_PORT) {
    throw new Error(`${name} must be a port number, and it holds '${value}'.`)
  }
  return port
}

/** Settles the port and the token. A token that is not throwaway stops it, and is never repeated. */
export function readFakeBackendOptions(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  generateToken: () => string,
): FakeBackendOptions {
  const { portEnv, tokenEnv } = readFlags(argv)
  const port = readPort(portEnv, env[portEnv])
  const token = env[tokenEnv]
  if (!token) return { port, token: generateToken(), tokenGenerated: true }
  if (!isThrowawayFakeToken(token)) {
    throw new Error(
      `${tokenEnv} does not start with '${FAKE_BACKEND_TOKEN_PREFIX}', so it may be a real token. A fake backend only takes a throwaway one.`,
    )
  }
  return { port, token, tokenGenerated: false }
}
