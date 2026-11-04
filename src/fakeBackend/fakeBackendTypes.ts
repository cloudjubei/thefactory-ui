/** The methods the fake answers on; every other one is an unknown route. */
export type FakeRouteMethod = 'GET' | 'POST'

/** What a route's answer reads from the request it was matched on. */
export interface FakeRouteRequest {
  /** The path's `{parameters}`, decoded. */
  params: Record<string, string>
  query: URLSearchParams
  /** The request's JSON body, parsed. */
  body: unknown
  /** Ends the answer as a 404 saying what the fixtures do not hold. */
  missing: (message: string) => never
}

/** One API route the fake answers. */
export interface FakeRoute {
  method: FakeRouteMethod
  /** The path as the generated API types spell it, `{parameters}` included. */
  path: string
  /** True for the routes the real backend answers with no token. */
  isPublic?: boolean
  answer: (request: FakeRouteRequest) => unknown
}

/** A route found for a request, with the path's parameters read. */
export interface FakeRouteMatch {
  route: FakeRoute
  params: Record<string, string>
}

/** One HTTP request, as the server hands it to the routes. */
export interface FakeHttpRequest {
  method: string
  pathname: string
  query: URLSearchParams
  authorization: string | undefined
  body: unknown
}

/** The status and JSON body one request is answered with. */
export interface FakeAnswer {
  status: number
  body: unknown
}

/** What answers a request: the route table and the one token it takes. */
export interface FakeAnswerContext {
  routes: readonly FakeRoute[]
  token: string
}

/** What the fake backend's command line and environment settle on. */
export interface FakeBackendOptions {
  /** The port to listen on; 0 takes any free one. */
  port: number
  /** The one bearer token the fake takes. */
  token: string
  /** True when no token was given and this one was made up. */
  tokenGenerated: boolean
}

/** What a `FakeBackendServer` is started with. */
export interface FakeBackendServerOptions {
  token: string
  /** The port to listen on; any free one when left out. */
  port?: number
  routes: readonly FakeRoute[]
  /** Told each request the fake could not answer, naming it. */
  log?: (line: string) => void
}

/** The groups of tools a chat context can be offered, on top of its transport's own. */
export type FakeChatToolScope =
  | 'common'
  | 'messaging'
  | 'global'
  | 'group'
  | 'project'
  | 'work'
  | 'run'
