import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FAKE_BACKEND_ROUTES } from './fakeBackendRoutes'
import { answerFakeRequest, matchFakeRoute } from './fakeBackendUtils'
import { STORY } from './fixtures/stories'

const TOKEN = 'fake-token'

const sdkOperations = () => {
  const sdk = readFileSync(new URL('../headless/api/generated/sdk.gen.ts', import.meta.url), 'utf8')
  const operations = new Set<string>()
  for (const [, method, url] of sdk.matchAll(
    /\.(get|post|put|patch|delete)<[\s\S]*?url: '([^']+)'/g,
  )) {
    operations.add(`${method?.toUpperCase()} ${url}`)
  }
  return operations
}

const get = (pathname: string, search = '') =>
  answerFakeRequest(
    {
      method: 'GET',
      pathname,
      query: new URLSearchParams(search),
      authorization: `Bearer ${TOKEN}`,
      body: undefined,
    },
    { routes: FAKE_BACKEND_ROUTES, token: TOKEN },
  )

const post = (pathname: string, body: unknown) =>
  answerFakeRequest(
    {
      method: 'POST',
      pathname,
      query: new URLSearchParams(),
      authorization: `Bearer ${TOKEN}`,
      body,
    },
    { routes: FAKE_BACKEND_ROUTES, token: TOKEN },
  )

describe('FAKE_BACKEND_ROUTES', () => {
  it('holds only operations the generated client knows, on their own method', () => {
    const operations = sdkOperations()
    const unknown = FAKE_BACKEND_ROUTES.map((route) => `${route.method} ${route.path}`).filter(
      (route) => route !== 'GET /health/startup' && !operations.has(route),
    )
    expect(unknown).toEqual([])
  })

  it('lists each route once', () => {
    const routes = FAKE_BACKEND_ROUTES.map((route) => `${route.method} ${route.path}`)
    expect(routes).toEqual([...new Set(routes)])
  })

  it('leaves only the routes the real backend leaves open without a token', () => {
    const open = FAKE_BACKEND_ROUTES.filter((route) => route.isPublic).map((route) => route.path)
    expect(open.sort()).toEqual(['/health', '/health/startup'])
  })

  it('answers the image check every client runs at start-up', () => {
    const { status, body } = post('/api/v1/cli-images/check', {})
    expect(status).toBe(200)
    expect(body).toEqual(get('/api/v1/cli-images').body)
  })

  it('answers the run list with the project asked for only', () => {
    const { body } = get('/api/v1/process-runs', 'projectId=thefactory-backend')
    expect(body).toEqual([])
  })

  it('leaves a child run out of a root-only list', () => {
    const { body } = get('/api/v1/process-runs', 'rootOnly=true&projectId=thefactory-tools')
    expect((body as { id: string }[]).map((run) => run.id)).toEqual(['run-story'])
  })

  it('keeps a child run in a list that does not ask for roots only', () => {
    const { body } = get('/api/v1/process-runs', 'projectId=thefactory-tools')
    expect((body as { id: string }[]).map((run) => run.id)).toEqual(['run-story', 'run-feature'])
  })

  it('reads several projects at once', () => {
    const { body } = get('/api/v1/process-runs', 'projectIds=wargames&projectIds=thefactory-tools')
    expect((body as unknown[]).length).toBe(2)
  })

  it('leaves out every project a group read does not name', () => {
    expect(get('/api/v1/process-runs', 'projectIds=wargames&projectIds=overseer').body).toEqual([])
  })

  it('narrows runs to a story', () => {
    expect(get('/api/v1/process-runs', 'storyId=nope').body).toEqual([])
  })

  it('answers a story the fixtures do not hold as not found', () => {
    const { status, body } = get('/api/v1/projects/thefactory-tools/stories/nope')
    expect(status).toBe(404)
    expect(body).toMatchObject({ error: expect.stringContaining("'nope'") })
  })

  it('finds a story in its own project only', () => {
    expect(get(`/api/v1/projects/thefactory-backend/stories/${STORY.id}`).status).toBe(404)
  })

  it('answers a run the fixtures do not hold as not found', () => {
    expect(get('/api/v1/process-runs/nope').status).toBe(404)
  })

  it('gives a project with no stories an empty list, not an error', () => {
    expect(get('/api/v1/projects/wargames/stories')).toEqual({ status: 200, body: [] })
  })

  it('reads no log when the screen shows none', () => {
    const { body } = get('/api/v1/projects/thefactory-tools/git/bundle', 'all=true&maxCount=0')
    expect((body as { log: { commits: unknown[] } }).log.commits).toEqual([])
  })

  it('reads the log a screen asks for', () => {
    const { body } = get('/api/v1/projects/thefactory-tools/git/bundle', 'all=true&maxCount=2')
    expect((body as { log: { commits: unknown[] } }).log.commits.length).toBe(2)
  })

  it('narrows cli models to the cli asked for', () => {
    const { body } = get('/api/v1/cli-runs/probe/models', 'cli=codex')
    expect((body as { models: unknown[] }).models).toEqual([])
  })

  it('answers a costs read with the chat it was asked about', () => {
    const { body } = get('/api/v1/costs/PROJECT-x')
    expect(body).toMatchObject({ chatKey: 'PROJECT-x', totalCostUSD: 0 })
  })

  it('answers the range of usage asked for', () => {
    const { body } = get('/api/v1/usage/daily', 'fromDay=2026-10-01&toDay=2026-10-02')
    expect(body).toMatchObject({ fromDay: '2026-10-01', toDay: '2026-10-02', summaries: [] })
  })

  it('refuses a chat read with no context', () => {
    expect(post('/api/v1/chats/get', {}).status).toBe(404)
  })

  it('answers the summary of a stored chat', () => {
    const context = { type: 'PROJECT', projectId: 'thefactory-tools' }
    expect(post('/api/v1/chats/summary', { context }).body).toMatchObject({ messageCount: 2 })
  })

  it('answers a summary of a chat never stored as not found, as a client drops it', () => {
    const context = { type: 'PROJECT', projectId: 'wargames' }
    expect(post('/api/v1/chats/summary', { context }).status).toBe(404)
  })

  it('tells a literal path from a parameter, as the run actions sit beside a run id', () => {
    const match = matchFakeRoute(FAKE_BACKEND_ROUTES, 'GET', '/api/v1/cli-runs/summaries')
    expect(match?.route.path).toBe('/api/v1/cli-runs/summaries')
  })

  it('offers two chat contexts different rows over the route', () => {
    const rows = (search: string) => get('/api/v1/tools/chat-catalog', search).body
    expect(rows('type=PROJECT&projectId=p1')).not.toEqual(rows('type=GENERAL'))
  })

  it('answers a catalogue read with no chat with the transport alone', () => {
    const { body } = get('/api/v1/tools/chat-catalog', 'runner=cli')
    expect((body as { name: string }[]).map((row) => row.name)).toContain('spawnAgent')
    expect((body as { name: string }[]).map((row) => row.name)).not.toContain('sendChatMessage')
  })
})
