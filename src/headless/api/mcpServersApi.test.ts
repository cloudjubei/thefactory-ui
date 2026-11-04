import { beforeEach, describe, expect, it, vi } from 'vitest'

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./generated/client.gen', () => ({ client }))

import {
  addMcpServer,
  listMcpServers,
  listMcpServerStatus,
  removeMcpServer,
  setMcpServerToken,
  startMcpServerSignIn,
  testMcpServer,
} from './mcpServersApi'

const GROUP = { kind: 'group' as const, groupId: 'osc' }
const PROJECT = { kind: 'project' as const, projectId: 'web app' }

beforeEach(() => {
  for (const fn of Object.values(client)) {
    fn.mockReset()
    fn.mockResolvedValue({ data: 'answer' })
  }
})

describe('the MCP server calls', () => {
  it('read a group’s servers from the group route and a project’s from its own, id encoded', async () => {
    expect(await listMcpServers(GROUP)).toBe('answer')
    expect(await listMcpServers(PROJECT)).toBe('answer')
    expect(client.get.mock.calls.map(([options]) => options.url)).toEqual([
      '/api/v1/projects-groups/osc/mcp-servers',
      '/api/v1/projects/web%20app/mcp-servers',
    ])
  })

  it('read the status under the owner', async () => {
    await listMcpServerStatus(GROUP)
    expect(client.get).toHaveBeenCalledWith({
      url: '/api/v1/projects-groups/osc/mcp-servers/status',
      throwOnError: true,
    })
  })

  it('add a server with its name, URL and way of signing in', async () => {
    const input = { name: 'Zenor', url: 'https://a.example.com', authType: 'oauth' as const }
    await addMcpServer(PROJECT, input)
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/projects/web%20app/mcp-servers',
      body: input,
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('remove a server by its id', async () => {
    await removeMcpServer(GROUP, 'a/b')
    expect(client.delete).toHaveBeenCalledWith({
      url: '/api/v1/projects-groups/osc/mcp-servers/a%2Fb',
      throwOnError: true,
    })
  })

  it('send a token to its own route, and nothing back to the caller', async () => {
    expect(await setMcpServerToken(GROUP, 's1', 'secret')).toBeUndefined()
    expect(client.put).toHaveBeenCalledWith({
      url: '/api/v1/projects-groups/osc/mcp-servers/s1/token',
      body: { token: 'secret' },
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('start a sign-in with the URL to return to, and answer the page to open', async () => {
    client.post.mockResolvedValue({ data: { authorizationUrl: 'https://auth.example.com' } })
    expect(await startMcpServerSignIn(GROUP, 's1', 'http://b/callback')).toBe(
      'https://auth.example.com',
    )
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/projects-groups/osc/mcp-servers/s1/sign-in',
      body: { redirectUrl: 'http://b/callback' },
      headers: { 'Content-Type': 'application/json' },
      throwOnError: true,
    })
  })

  it('test a server through whichever owner shows it', async () => {
    await testMcpServer(PROJECT, 's1')
    expect(client.post).toHaveBeenCalledWith({
      url: '/api/v1/projects/web%20app/mcp-servers/s1/test',
      throwOnError: true,
    })
  })
})
