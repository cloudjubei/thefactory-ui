import { describe, expect, it } from 'vitest'
import {
  answerFakeRequest,
  bearerTokenOf,
  isThrowawayFakeToken,
  matchFakeRoute,
  readFakeBackendOptions,
} from './fakeBackendUtils'
import type { FakeHttpRequest, FakeRoute } from './fakeBackendTypes'

const TOKEN = 'fake-token'

const ROUTES: FakeRoute[] = [
  { method: 'GET', path: '/health', isPublic: true, answer: () => ({ status: 'ok' }) },
  { method: 'GET', path: '/api/v1/projects', answer: () => ['project'] },
  {
    method: 'GET',
    path: '/api/v1/projects/{projectId}/stories/{storyId}',
    answer: ({ params }) => params,
  },
  { method: 'GET', path: '/api/v1/projects/{projectId}/stories/order', answer: () => ['order'] },
  { method: 'POST', path: '/api/v1/chats/get', answer: ({ body }) => body },
  { method: 'GET', path: '/api/v1/search', answer: ({ query }) => query.getAll('tag') },
]

const request = (over: Partial<FakeHttpRequest> = {}): FakeHttpRequest => ({
  method: 'GET',
  pathname: '/api/v1/projects',
  query: new URLSearchParams(),
  authorization: `Bearer ${TOKEN}`,
  body: undefined,
  ...over,
})

describe('matchFakeRoute', () => {
  it('finds a literal path', () => {
    expect(matchFakeRoute(ROUTES, 'GET', '/api/v1/projects')?.route.path).toBe('/api/v1/projects')
  })

  it('reads each path parameter', () => {
    expect(matchFakeRoute(ROUTES, 'GET', '/api/v1/projects/p1/stories/s1')?.params).toEqual({
      projectId: 'p1',
      storyId: 's1',
    })
  })

  it('decodes an encoded parameter', () => {
    expect(matchFakeRoute(ROUTES, 'GET', '/api/v1/projects/a%3Ab/stories/s1')?.params).toEqual({
      projectId: 'a:b',
      storyId: 's1',
    })
  })

  it('prefers a literal segment over a parameter, wherever the table lists it', () => {
    expect(matchFakeRoute(ROUTES, 'GET', '/api/v1/projects/p1/stories/order')?.route.path).toBe(
      '/api/v1/projects/{projectId}/stories/order',
    )
  })

  it('does not match a path one segment longer', () => {
    expect(matchFakeRoute(ROUTES, 'GET', '/api/v1/projects/p1/stories/s1/more')).toBeUndefined()
  })

  it('does not match a path one segment shorter', () => {
    expect(matchFakeRoute(ROUTES, 'GET', '/api/v1/projects/p1/stories')).toBeUndefined()
  })

  it('does not match the same path on another method', () => {
    expect(matchFakeRoute(ROUTES, 'POST', '/api/v1/projects')).toBeUndefined()
  })

  it('takes no empty parameter', () => {
    expect(matchFakeRoute(ROUTES, 'GET', '/api/v1/projects//stories/s1')).toBeUndefined()
  })
})

describe('bearerTokenOf', () => {
  it('reads the token of a bearer header', () => {
    expect(bearerTokenOf('Bearer abc')).toBe('abc')
  })

  it('reads a bearer scheme in any case', () => {
    expect(bearerTokenOf('bearer abc')).toBe('abc')
  })

  it('reads nothing from another scheme', () => {
    expect(bearerTokenOf('Basic abc')).toBeUndefined()
  })

  it('reads nothing from no header', () => {
    expect(bearerTokenOf(undefined)).toBeUndefined()
  })
})

describe('isThrowawayFakeToken', () => {
  it('takes a token with the fake prefix', () => {
    expect(isThrowawayFakeToken('fake-5f0c')).toBe(true)
  })

  it('refuses a token without it', () => {
    expect(isThrowawayFakeToken('sk-ant-real')).toBe(false)
  })

  it('refuses the bare prefix, which is no token at all', () => {
    expect(isThrowawayFakeToken('fake-')).toBe(false)
  })
})

describe('answerFakeRequest', () => {
  const answer = (over: Partial<FakeHttpRequest> = {}) =>
    answerFakeRequest(request(over), { routes: ROUTES, token: TOKEN })

  it('answers a known route with its fixture', () => {
    expect(answer()).toEqual({ status: 200, body: ['project'] })
  })

  it('hands the route its query', () => {
    expect(
      answer({ pathname: '/api/v1/search', query: new URLSearchParams('tag=a&tag=b') }),
    ).toEqual({ status: 200, body: ['a', 'b'] })
  })

  it('hands the route its body', () => {
    expect(answer({ method: 'POST', pathname: '/api/v1/chats/get', body: { a: 1 } })).toEqual({
      status: 200,
      body: { a: 1 },
    })
  })

  it('refuses a read with no token', () => {
    expect(answer({ authorization: undefined }).status).toBe(401)
  })

  it('refuses a read with another token', () => {
    expect(answer({ authorization: 'Bearer real-token' }).status).toBe(401)
  })

  it('answers a public route with no token', () => {
    expect(answer({ pathname: '/health', authorization: undefined })).toEqual({
      status: 200,
      body: { status: 'ok' },
    })
  })

  it('names an unknown route, its method and that it is the fake', () => {
    const { status, body } = answer({ pathname: '/api/v1/nope' })
    expect(status).toBe(404)
    expect(body).toMatchObject({
      code: 'FAKE_BACKEND_UNKNOWN_ROUTE',
      route: 'GET /api/v1/nope',
      error: expect.stringContaining('GET /api/v1/nope'),
    })
  })

  it('names a known path asked with a method it does not answer', () => {
    expect(answer({ method: 'PATCH' }).body).toMatchObject({ route: 'PATCH /api/v1/projects' })
  })

  it('names an unknown route even with no token, so a verifier sees what is missing', () => {
    expect(answer({ pathname: '/api/v1/nope', authorization: undefined }).status).toBe(404)
  })

  it('turns a throwing fixture into an error naming the route', () => {
    const routes: FakeRoute[] = [
      {
        method: 'GET',
        path: '/api/v1/boom',
        answer: () => {
          throw new Error('no fixture for it')
        },
      },
    ]
    const { status, body } = answerFakeRequest(request({ pathname: '/api/v1/boom' }), {
      routes,
      token: TOKEN,
    })
    expect(status).toBe(500)
    expect(body).toMatchObject({
      route: 'GET /api/v1/boom',
      error: expect.stringContaining('no fixture for it'),
    })
  })

  it('answers a missing fixture record as not found, naming the route', () => {
    const routes: FakeRoute[] = [
      {
        method: 'GET',
        path: '/api/v1/stories/{id}',
        answer: ({ params, missing }) => missing(`No fake story '${params.id}'.`),
      },
    ]
    const { status, body } = answerFakeRequest(request({ pathname: '/api/v1/stories/s9' }), {
      routes,
      token: TOKEN,
    })
    expect(status).toBe(404)
    expect(body).toMatchObject({
      code: 'FAKE_BACKEND_NO_RECORD',
      route: 'GET /api/v1/stories/s9',
      error: expect.stringContaining("No fake story 's9'."),
    })
  })
})

describe('readFakeBackendOptions', () => {
  const generate = () => 'fake-generated'

  it('reads the port from PORT by default', () => {
    expect(readFakeBackendOptions([], { PORT: '4100' }, generate).port).toBe(4100)
  })

  it('reads the port from the variable it is told', () => {
    expect(readFakeBackendOptions(['--port-env', 'P'], { P: '4200' }, generate).port).toBe(4200)
  })

  it('takes any free port when no port is set', () => {
    expect(readFakeBackendOptions([], {}, generate).port).toBe(0)
  })

  it('refuses a port that is not a number', () => {
    expect(() => readFakeBackendOptions([], { PORT: 'abc' }, generate)).toThrow(/PORT/)
  })

  it('refuses a port out of range', () => {
    expect(() => readFakeBackendOptions([], { PORT: '70000' }, generate)).toThrow(/PORT/)
  })

  it('reads the token from the variable it is told', () => {
    const argv = ['--token-env', 'VITE_BEARER_TOKEN']
    expect(readFakeBackendOptions(argv, { VITE_BEARER_TOKEN: 'fake-1' }, generate)).toMatchObject({
      token: 'fake-1',
      tokenGenerated: false,
    })
  })

  it('makes up a throwaway token when none is set', () => {
    expect(readFakeBackendOptions([], {}, generate)).toMatchObject({
      token: 'fake-generated',
      tokenGenerated: true,
    })
  })

  it('refuses a token that is not throwaway, and never repeats it', () => {
    const argv = ['--token-env', 'T']
    const read = () => readFakeBackendOptions(argv, { T: 'sk-real-secret' }, generate)
    expect(read).toThrow(/T does not start with 'fake-'/)
    expect(read).not.toThrow(/sk-real-secret/)
  })

  it('refuses an argument it does not know', () => {
    expect(() => readFakeBackendOptions(['--host', '0.0.0.0'], {}, generate)).toThrow(/--host/)
  })

  it('refuses a flag with no variable name', () => {
    expect(() => readFakeBackendOptions(['--token-env'], {}, generate)).toThrow(/--token-env/)
  })
})
