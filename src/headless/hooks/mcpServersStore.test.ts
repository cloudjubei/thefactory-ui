import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { McpServerRow, McpServerStanding } from '../utils/mcpServersTypes'

const api = vi.hoisted(() => ({
  listMcpServers: vi.fn(),
  listMcpServerStatus: vi.fn(),
  addMcpServer: vi.fn(),
  removeMcpServer: vi.fn(),
  setMcpServerToken: vi.fn(),
  startMcpServerSignIn: vi.fn(),
  testMcpServer: vi.fn(),
}))

vi.mock('../api/mcpServersApi', () => api)

import { McpServersStore } from './mcpServersStore'

const OWNER = { kind: 'group' as const, groupId: 'osc' }
const BACKEND = 'http://localhost:7001'

const row = (id: string, over: Partial<McpServerRow> = {}): McpServerRow => ({
  id,
  name: id,
  url: `https://${id}.example.com`,
  authType: 'oauth',
  hasCredential: false,
  source: 'group',
  groupId: 'osc',
  ...over,
})

const standing = (
  serverId: string,
  status: McpServerStanding['status'] = 'connected',
): McpServerStanding => ({ serverId, status, toolCount: 0, omittedTools: 0, tools: [] })

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const backendError = (error: string) => ({
  isAxiosError: true,
  response: { status: 422, data: { error } },
})

const store = () => new McpServersStore(OWNER, () => BACKEND)

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
  api.listMcpServers.mockResolvedValue([row('s1')])
  api.listMcpServerStatus.mockResolvedValue([standing('s1')])
})

describe('McpServersStore reads', () => {
  it('starts with nothing read', () => {
    expect(store().getState()).toMatchObject({
      rows: undefined,
      standings: undefined,
      busy: false,
      error: null,
    })
  })

  it('shows the servers before their status comes in', async () => {
    const status = deferred<McpServerStanding[]>()
    api.listMcpServerStatus.mockReturnValue(status.promise)
    const s = store()
    const read = s.refresh()
    await vi.waitFor(() => expect(s.getState().rows).toHaveLength(1))
    expect(s.getState().standings).toBeUndefined()
    status.resolve([standing('s1')])
    await read
    expect(s.getState().standings).toHaveLength(1)
  })

  it('asks for the owner it was made for', async () => {
    await store().refresh()
    expect(api.listMcpServers).toHaveBeenCalledWith(OWNER)
    expect(api.listMcpServerStatus).toHaveBeenCalledWith(OWNER)
  })

  it('tells listeners, and stops when they leave', async () => {
    const s = store()
    const heard = vi.fn()
    const leave = s.subscribe(heard)
    await s.refresh()
    const times = heard.mock.calls.length
    expect(times).toBeGreaterThan(0)
    leave()
    await s.refresh()
    expect(heard).toHaveBeenCalledTimes(times)
  })

  it('keeps what it showed and says why when the list cannot be read', async () => {
    const s = store()
    await s.refresh()
    api.listMcpServers.mockRejectedValue(backendError('Group osc not found'))
    await s.refresh()
    expect(s.getState().rows).toHaveLength(1)
    expect(s.getState().error).toBe('Group osc not found')
  })

  it('clears the error once a read works again', async () => {
    const s = store()
    api.listMcpServers.mockRejectedValueOnce(backendError('down'))
    await s.refresh()
    await s.refresh()
    expect(s.getState().error).toBeNull()
  })

  it('marks the status as failed without losing the servers, until it reads again', async () => {
    const s = store()
    api.listMcpServerStatus.mockRejectedValueOnce(backendError('down'))
    await s.refresh()
    expect(s.getState()).toMatchObject({ statusFailed: true, standings: undefined, error: null })
    expect(s.getState().rows).toHaveLength(1)
    await s.refresh()
    expect(s.getState()).toMatchObject({ statusFailed: false })
    expect(s.getState().standings).toHaveLength(1)
  })

  it('drops a slow read that a newer one overtook', async () => {
    const slowRows = deferred<McpServerRow[]>()
    const slowStatus = deferred<McpServerStanding[]>()
    api.listMcpServers.mockReturnValueOnce(slowRows.promise)
    api.listMcpServerStatus.mockReturnValueOnce(slowStatus.promise)
    const s = store()
    const first = s.refresh()
    api.listMcpServers.mockResolvedValue([row('new')])
    api.listMcpServerStatus.mockResolvedValue([standing('new')])
    await s.refresh()
    slowRows.resolve([row('old')])
    slowStatus.resolve([standing('old')])
    await first
    expect(s.getState().rows?.map((r) => r.id)).toEqual(['new'])
    expect(s.getState().standings?.map((x) => x.serverId)).toEqual(['new'])
  })

  it('drops a slow failure too', async () => {
    const slow = deferred<McpServerRow[]>()
    api.listMcpServers.mockReturnValueOnce(slow.promise)
    const s = store()
    const first = s.refresh()
    await s.refresh()
    slow.reject(backendError('old failure'))
    await first
    expect(s.getState().error).toBeNull()
  })
})

describe('McpServersStore changes', () => {
  const input = { name: 'Zenor', url: 'https://a.example.com', authType: 'oauth' as const }

  it('adds a server and reads again, answering the new row', async () => {
    const added = row('s2')
    api.addMcpServer.mockResolvedValue(added)
    api.listMcpServers.mockResolvedValue([row('s1'), added])
    const s = store()
    expect(await s.add(input)).toEqual(added)
    expect(api.addMcpServer).toHaveBeenCalledWith(OWNER, input)
    expect(s.getState().rows).toHaveLength(2)
    expect(s.getState().busy).toBe(false)
  })

  it('is busy while a change is out', async () => {
    const adding = deferred<McpServerRow>()
    api.addMcpServer.mockReturnValue(adding.promise)
    const s = store()
    const change = s.add(input)
    expect(s.getState().busy).toBe(true)
    adding.resolve(row('s2'))
    await change
    expect(s.getState().busy).toBe(false)
  })

  it('answers nothing and says why when the add is refused', async () => {
    api.addMcpServer.mockRejectedValue(backendError('repeats the name'))
    const s = store()
    expect(await s.add(input)).toBeUndefined()
    expect(s.getState()).toMatchObject({ error: 'repeats the name', busy: false })
  })

  it('removes a server, forgetting what it knew of it', async () => {
    api.testMcpServer.mockResolvedValue({ status: 'connected', tools: [] })
    api.startMcpServerSignIn.mockResolvedValue('https://auth.example.com')
    const s = store()
    await s.test('s1')
    await s.signIn('s1')
    api.listMcpServers.mockResolvedValue([])
    expect(await s.remove('s1')).toBe(true)
    expect(api.removeMcpServer).toHaveBeenCalledWith(OWNER, 's1')
    expect(s.getState()).toMatchObject({ rows: [], tests: {}, signIns: {} })
  })

  it('says so when a remove fails', async () => {
    api.removeMcpServer.mockRejectedValue({})
    const s = store()
    expect(await s.remove('s1')).toBe(false)
    expect(s.getState().error).toBe('Could not remove the server.')
  })

  it('saves a token and keeps no copy of it', async () => {
    const s = store()
    expect(await s.setToken('s1', '  tok-123  ')).toBe(true)
    expect(api.setMcpServerToken).toHaveBeenCalledWith(OWNER, 's1', 'tok-123')
    expect(JSON.stringify(s.getState())).not.toContain('tok-123')
  })

  it('never sends a blank token: blank means keep', async () => {
    const s = store()
    expect(await s.setToken('s1', '   ')).toBe(false)
    expect(api.setMcpServerToken).not.toHaveBeenCalled()
    expect(s.getState().error).toBeNull()
  })

  it('does not put a refused token in the error it shows', async () => {
    api.setMcpServerToken.mockRejectedValue(new Error('tok-123 refused'))
    const s = store()
    expect(await s.setToken('s1', 'tok-123')).toBe(false)
    expect(s.getState().error).toBe('Could not save the token.')
  })
})

describe('McpServersStore sign-in', () => {
  it('sends the callback under the backend URL and answers the page to open', async () => {
    api.startMcpServerSignIn.mockResolvedValue('https://auth.example.com/a')
    const s = store()
    expect(await s.signIn('s1')).toBe('https://auth.example.com/a')
    expect(api.startMcpServerSignIn).toHaveBeenCalledWith(
      OWNER,
      's1',
      'http://localhost:7001/api/v1/mcp-servers/oauth/callback',
    )
    expect(s.getState().signIns).toEqual({ s1: 'https://auth.example.com/a' })
  })

  it('asks for the backend URL when it signs in, so a changed URL is the one sent', async () => {
    api.startMcpServerSignIn.mockResolvedValue('https://auth.example.com/a')
    let url = 'http://one:7001'
    const s = new McpServersStore(OWNER, () => url)
    url = 'http://two:7001'
    await s.signIn('s1')
    expect(api.startMcpServerSignIn.mock.calls[0]?.[2]).toMatch(/^http:\/\/two:7001/)
  })

  it('shows the reason when it cannot start, and opens nothing', async () => {
    api.startMcpServerSignIn.mockRejectedValue(backendError('The server has no sign-in'))
    const s = store()
    expect(await s.signIn('s1')).toBeUndefined()
    expect(s.getState()).toMatchObject({ error: 'The server has no sign-in', signIns: {} })
  })

  it('opens nothing but a web page: the address comes from an outside server', async () => {
    api.startMcpServerSignIn.mockResolvedValue('file:///etc/passwd')
    const s = store()
    expect(await s.signIn('s1')).toBeUndefined()
    expect(s.getState()).toMatchObject({
      error: 'The server gave a sign-in page that can’t be opened.',
      signIns: {},
    })
  })

  it('refuses with no backend URL rather than send a broken one', async () => {
    const s = new McpServersStore(OWNER, () => null)
    expect(await s.signIn('s1')).toBeUndefined()
    expect(api.startMcpServerSignIn).not.toHaveBeenCalled()
    expect(s.getState().error).toBe('Not connected to a backend yet.')
  })

  it('finishes every sign-in on the signed-in event and reads again', async () => {
    api.startMcpServerSignIn.mockResolvedValue('https://auth.example.com/a')
    const s = store()
    await s.signIn('s1')
    await s.signIn('s2')
    api.listMcpServers.mockResolvedValue([row('s1', { hasCredential: true })])
    await s.onEvent({ action: 'signed-in' })
    expect(s.getState().signIns).toEqual({})
    expect(s.getState().rows?.[0]?.hasCredential).toBe(true)
  })

  it('keeps a sign-in waiting through other events: only its own end clears it', async () => {
    api.startMcpServerSignIn.mockResolvedValue('https://auth.example.com/a')
    const s = store()
    await s.refresh()
    await s.signIn('s1')
    await s.onEvent({ action: 'updated', serverId: 's9', groupId: 'osc' })
    expect(s.getState().signIns).toEqual({ s1: 'https://auth.example.com/a' })
    expect(api.listMcpServers).toHaveBeenCalled()
  })

  it('keeps a sign-in waiting when the person comes back without finishing', async () => {
    api.startMcpServerSignIn.mockResolvedValue('https://auth.example.com/a')
    api.listMcpServerStatus.mockResolvedValue([standing('s1', 'needs-sign-in')])
    const s = store()
    await s.signIn('s1')
    await s.refresh()
    expect(s.getState().signIns).toEqual({ s1: 'https://auth.example.com/a' })
  })

  it('finishes a sign-in whose event was missed: a read shows it came up', async () => {
    api.startMcpServerSignIn.mockResolvedValue('https://auth.example.com/a')
    api.listMcpServers.mockResolvedValue([row('s1', { hasCredential: true })])
    api.listMcpServerStatus.mockResolvedValue([standing('s1', 'needs-sign-in')])
    const s = store()
    await s.refresh()
    await s.signIn('s1')
    api.listMcpServerStatus.mockResolvedValue([standing('s1', 'connected')])
    await s.refresh()
    expect(s.getState().signIns).toEqual({})
  })
})

describe('McpServersStore test', () => {
  it('asks the server and holds its answer, marking it while it waits', async () => {
    const answer = deferred<{ status: 'connected'; tools: [] }>()
    api.testMcpServer.mockReturnValue(answer.promise)
    const s = store()
    const testing = s.test('s1')
    expect(s.getState().testing).toEqual(['s1'])
    answer.resolve({ status: 'connected', tools: [] })
    await testing
    expect(s.getState().testing).toEqual([])
    expect(s.getState().tests.s1).toEqual({ status: 'connected', tools: [] })
  })

  it('lets two servers be tested at once', async () => {
    const one = deferred<{ status: 'connected'; tools: [] }>()
    api.testMcpServer.mockReturnValueOnce(one.promise)
    api.testMcpServer.mockResolvedValueOnce({ status: 'unreachable', tools: [] })
    const s = store()
    const first = s.test('s1')
    await s.test('s2')
    expect(s.getState().testing).toEqual(['s1'])
    one.resolve({ status: 'connected', tools: [] })
    await first
    expect(Object.keys(s.getState().tests).sort()).toEqual(['s1', 's2'])
  })

  it('says why when the test itself fails, and drops any older answer', async () => {
    api.testMcpServer.mockResolvedValueOnce({ status: 'connected', tools: [] })
    const s = store()
    await s.test('s1')
    api.testMcpServer.mockRejectedValue(backendError('Group osc holds no MCP server s1'))
    await s.test('s1')
    expect(s.getState()).toMatchObject({
      error: 'Group osc holds no MCP server s1',
      testing: [],
      tests: {},
    })
  })

  it('lets a later read replace a test’s answer', async () => {
    api.testMcpServer.mockResolvedValue({ status: 'unreachable', tools: [] })
    const s = store()
    await s.test('s1')
    await s.refresh()
    expect(s.getState().tests).toEqual({})
  })

  it('keeps an answer that came in during a read', async () => {
    const status = deferred<McpServerStanding[]>()
    api.listMcpServerStatus.mockReturnValue(status.promise)
    api.testMcpServer.mockResolvedValue({ status: 'unreachable', tools: [] })
    const s = store()
    const read = s.refresh()
    await s.test('s1')
    status.resolve([standing('s1')])
    await read
    expect(s.getState().tests.s1?.status).toBe('unreachable')
  })
})
