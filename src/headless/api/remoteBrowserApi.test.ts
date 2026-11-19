import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatContext } from './generated'
import { client } from './generated/client.gen'
import { REMOTE_BROWSER_ROUTES } from './remoteBrowserApi'

const CONTEXT = { type: 'PROJECT', projectId: 'p' } as ChatContext
const QUERY = { context: JSON.stringify(CONTEXT) }
const SESSIONS = '/api/v1/projects/{projectId}/remote-browser/sessions'
const SESSION = `${SESSIONS}/{sessionId}`

afterEach(() => {
  vi.restoreAllMocks()
})

const lastCall = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.at(-1)?.[0] as Record<string, unknown>

describe('REMOTE_BROWSER_ROUTES', () => {
  it('lists the chat’s browsers', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ data: [{ sessionId: 's' }] } as never)
    await expect(REMOTE_BROWSER_ROUTES.list('p', CONTEXT)).resolves.toEqual([{ sessionId: 's' }])
    expect(lastCall(get)).toMatchObject({
      url: SESSIONS,
      path: { projectId: 'p' },
      query: QUERY,
      throwOnError: true,
    })
  })

  it('opens a page', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { sessionId: 's' } } as never)
    const body = { url: 'https://a.dev', viewport: { width: 1, height: 2 } }
    await expect(REMOTE_BROWSER_ROUTES.open('p', CONTEXT, body)).resolves.toEqual({
      sessionId: 's',
    })
    expect(lastCall(post)).toMatchObject({ url: SESSIONS, query: QUERY, body })
  })

  it('closes a browser', async () => {
    const del = vi.spyOn(client, 'delete').mockResolvedValue({ data: { closed: true } } as never)
    await expect(REMOTE_BROWSER_ROUTES.close('p', CONTEXT, 's')).resolves.toBeUndefined()
    expect(lastCall(del)).toMatchObject({
      url: SESSION,
      path: { projectId: 'p', sessionId: 's' },
      query: QUERY,
    })
  })

  it('sends input, resizes, picks and marks', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ data: { ok: true } } as never)
    const input = { kind: 'text' as const, text: 'a' }
    await expect(REMOTE_BROWSER_ROUTES.input('p', CONTEXT, 's', input)).resolves.toEqual({
      ok: true,
    })
    expect(lastCall(post)).toMatchObject({ url: `${SESSION}/input`, body: input, query: QUERY })
    await REMOTE_BROWSER_ROUTES.resize('p', CONTEXT, 's', { width: 3, height: 4 })
    expect(lastCall(post)).toMatchObject({
      url: `${SESSION}/resize`,
      body: { width: 3, height: 4 },
    })
    await REMOTE_BROWSER_ROUTES.pick('p', CONTEXT, 's', { x: 1, y: 2 })
    expect(lastCall(post)).toMatchObject({ url: `${SESSION}/pick`, body: { x: 1, y: 2 } })
    await REMOTE_BROWSER_ROUTES.mark('p', CONTEXT, 's', { x: 1, y: 2, width: 3, height: 4 })
    expect(lastCall(post)).toMatchObject({
      url: `${SESSION}/mark`,
      body: { x: 1, y: 2, width: 3, height: 4 },
      path: { projectId: 'p', sessionId: 's' },
    })
  })
})
