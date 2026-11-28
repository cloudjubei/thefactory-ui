import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SignInSessionState } from 'thefactory-tools/types'
import type { McpServerRow, McpServerStanding } from '../utils/mcpServersTypes'

const api = vi.hoisted(() => ({
  listMcpServers: vi.fn(),
  listMcpServerStatus: vi.fn(),
  addMcpServer: vi.fn(),
  removeMcpServer: vi.fn(),
  setMcpServerToken: vi.fn(),
  editMcpServer: vi.fn(),
  startMcpServerSignIn: vi.fn(),
  testMcpServer: vi.fn(),
}))

vi.mock('../api/mcpServersApi', () => api)

import { MCP_SERVER_SIGN_IN_FAILED } from '../utils/mcpServersConstants'
import { SIGN_IN_SESSION_TEXT } from '../utils/signInSessionConstants'
import { McpServersStore } from './mcpServersStore'

const OWNER = { kind: 'group' as const, groupId: 'osc' }

const row = (id: string, over: Partial<McpServerRow> = {}): McpServerRow => ({
  id,
  name: id,
  url: `https://${id}.example.com`,
  authType: 'oauth',
  hasCredential: false,
  onlyReads: false,
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

const session = (id: string, over: Partial<SignInSessionState> = {}): SignInSessionState => ({
  id,
  kind: 'mcp-server',
  subject: `group:osc:${id}`,
  title: 'Sign in to s1',
  status: 'open',
  surface: { kind: 'browser' },
  startedAt: '2026-11-27T12:00:00.000Z',
  expiresAt: '2026-11-27T12:15:00.000Z',
  ...over,
})

function fakeSignIn() {
  const endings = new Set<(ended: SignInSessionState) => void>()
  return {
    show: vi.fn(),
    onEnded: (listener: (ended: SignInSessionState) => void) => {
      endings.add(listener)
      return () => {
        endings.delete(listener)
      }
    },
    end: (ended: SignInSessionState) => endings.forEach((ending) => ending(ended)),
    held: () => endings.size,
  }
}

const store = (signIn = fakeSignIn()) => new McpServersStore(OWNER, signIn)

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
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
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

  it('turns the switch on and off, and reads again', async () => {
    api.editMcpServer.mockResolvedValue(row('s1', { onlyReads: true }))
    api.listMcpServers.mockResolvedValue([row('s1', { onlyReads: true })])
    const s = store()
    expect(await s.setOnlyReads('s1', true)).toBe(true)
    expect(api.editMcpServer).toHaveBeenCalledWith(OWNER, 's1', { onlyReads: true })
    expect(s.getState().rows?.[0]?.onlyReads).toBe(true)
    expect(api.listMcpServerStatus).toHaveBeenCalled()
    expect(await s.setOnlyReads('s1', false)).toBe(true)
    expect(api.editMcpServer).toHaveBeenLastCalledWith(OWNER, 's1', { onlyReads: false })
  })

  it('says why when the switch is refused, and answers false', async () => {
    api.editMcpServer.mockRejectedValue(backendError('Group osc holds no MCP server s1'))
    const s = store()
    expect(await s.setOnlyReads('s1', true)).toBe(false)
    expect(s.getState()).toMatchObject({ error: 'Group osc holds no MCP server s1', busy: false })
    api.editMcpServer.mockRejectedValue({})
    expect(await s.setOnlyReads('s1', true)).toBe(false)
    expect(s.getState().error).toBe('Could not change the setting.')
  })

  it('does not put a refused token in the error it shows', async () => {
    api.setMcpServerToken.mockRejectedValue(new Error('tok-123 refused'))
    const s = store()
    expect(await s.setToken('s1', 'tok-123')).toBe(false)
    expect(s.getState().error).toBe('Could not save the token.')
  })
})

describe('McpServersStore sign-in', () => {
  const signedIn = () => {
    const signIn = fakeSignIn()
    const s = store(signIn)
    const release = s.retain()
    return { signIn, s, release }
  }

  it('shows starting at once, then shows the session the backend opened', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    const { s, signIn } = signedIn()
    const going = s.signIn('s1')
    expect(s.getState()).toMatchObject({ signIns: { s1: { step: 'starting' } }, error: null })
    await going
    expect(api.startMcpServerSignIn).toHaveBeenCalledWith(OWNER, 's1')
    expect(signIn.show).toHaveBeenCalledWith(session('a'))
    expect(s.getState().signIns).toEqual({ s1: { step: 'open', session: session('a') } })
    expect(s.getState().busy).toBe(false)
  })

  it('asks once however often it is pressed while starting', async () => {
    const answer = deferred<SignInSessionState>()
    api.startMcpServerSignIn.mockReturnValue(answer.promise)
    const { s } = signedIn()
    const first = s.signIn('s1')
    await s.signIn('s1')
    answer.resolve(session('a'))
    await first
    expect(api.startMcpServerSignIn).toHaveBeenCalledTimes(1)
  })

  it('shows the open sign-in again on a press while it is open, asking nothing', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    const { s, signIn } = signedIn()
    await s.signIn('s1')
    await s.signIn('s1')
    expect(api.startMcpServerSignIn).toHaveBeenCalledTimes(1)
    expect(signIn.show).toHaveBeenCalledTimes(2)
  })

  it('keeps each server’s sign-in to itself', async () => {
    api.startMcpServerSignIn.mockResolvedValueOnce(session('a')).mockResolvedValueOnce(session('b'))
    const { s, signIn } = signedIn()
    await s.signIn('s1')
    await s.signIn('s2')
    signIn.end(session('a', { status: 'closed' }))
    expect(s.getState().signIns).toEqual({ s2: { step: 'open', session: session('b') } })
  })

  it('rolls back with the backend’s words when it cannot start, showing nothing', async () => {
    api.startMcpServerSignIn.mockRejectedValue(backendError('The server has no sign-in'))
    const { s, signIn } = signedIn()
    await s.signIn('s1')
    expect(s.getState()).toMatchObject({ error: 'The server has no sign-in', signIns: {} })
    expect(signIn.show).not.toHaveBeenCalled()
  })

  it('falls back to its own words for a refusal it cannot read', async () => {
    api.startMcpServerSignIn.mockRejectedValue({})
    const { s } = signedIn()
    await s.signIn('s1')
    expect(s.getState().error).toBe(MCP_SERVER_SIGN_IN_FAILED)
  })

  it('reads again once its session finished', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    const { s, signIn } = signedIn()
    await s.signIn('s1')
    api.listMcpServers.mockResolvedValue([row('s1', { hasCredential: true })])
    signIn.end(session('a', { status: 'finished' }))
    expect(s.getState().signIns).toEqual({})
    await vi.waitFor(() => expect(s.getState().rows?.[0]?.hasCredential).toBe(true))
    expect(s.getState().error).toBeNull()
  })

  it('says why a session that ran out or failed ended', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    const { s, signIn } = signedIn()
    await s.signIn('s1')
    signIn.end(session('a', { status: 'timed-out' }))
    expect(s.getState()).toMatchObject({ signIns: {}, error: SIGN_IN_SESSION_TEXT.timedOut })
    await s.signIn('s1')
    signIn.end(session('a', { status: 'failed', error: 'The server said no.' }))
    expect(s.getState()).toMatchObject({ signIns: {}, error: 'The server said no.' })
  })

  it('goes back without a word when the person closed it', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    const { s, signIn } = signedIn()
    await s.signIn('s1')
    signIn.end(session('a', { status: 'closed' }))
    expect(s.getState()).toMatchObject({ signIns: {}, error: null })
    expect(api.listMcpServers).not.toHaveBeenCalled()
  })

  it('ignores a session it did not start', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    const { s, signIn } = signedIn()
    await s.signIn('s1')
    signIn.end(session('other', { status: 'timed-out' }))
    expect(s.getState()).toMatchObject({ signIns: { s1: { step: 'open' } }, error: null })
  })

  it('keeps an ending heard before the start answered, showing nothing', async () => {
    const answer = deferred<SignInSessionState>()
    api.startMcpServerSignIn.mockReturnValue(answer.promise)
    const { s, signIn } = signedIn()
    const going = s.signIn('s1')
    signIn.end(session('other', { status: 'closed' }))
    signIn.end(session('a', { status: 'timed-out' }))
    answer.resolve(session('a'))
    await going
    expect(signIn.show).not.toHaveBeenCalled()
    expect(s.getState()).toMatchObject({ signIns: {}, error: SIGN_IN_SESSION_TEXT.timedOut })
  })

  it('forgets endings once nothing is starting', async () => {
    const answer = deferred<SignInSessionState>()
    api.startMcpServerSignIn.mockReturnValueOnce(answer.promise)
    const { s, signIn } = signedIn()
    const going = s.signIn('s1')
    signIn.end(session('b', { status: 'closed' }))
    answer.resolve(session('a'))
    await going
    api.startMcpServerSignIn.mockResolvedValueOnce(session('b'))
    await s.signIn('s2')
    expect(s.getState().signIns.s2).toEqual({ step: 'open', session: session('b') })
  })

  it('stops hearing endings once released, however often released', () => {
    const { signIn, release } = signedIn()
    expect(signIn.held()).toBe(1)
    release()
    release()
    expect(signIn.held()).toBe(0)
  })

  it('hears once however many hold it', () => {
    const { signIn, s, release } = signedIn()
    const second = s.retain()
    expect(signIn.held()).toBe(1)
    second()
    expect(signIn.held()).toBe(1)
    release()
    expect(signIn.held()).toBe(0)
  })

  it('keeps a sign-in open through other events', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    const { s } = signedIn()
    await s.refresh()
    await s.signIn('s1')
    await s.onEvent({ action: 'updated', serverId: 's9', groupId: 'osc' })
    await s.onEvent({ action: 'signed-in' })
    expect(s.getState().signIns).toEqual({ s1: { step: 'open', session: session('a') } })
  })

  it('keeps a sign-in open when a read shows its server still wants one', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    api.listMcpServerStatus.mockResolvedValue([standing('s1', 'needs-sign-in')])
    const { s } = signedIn()
    await s.signIn('s1')
    await s.refresh()
    expect(s.getState().signIns).toEqual({ s1: { step: 'open', session: session('a') } })
  })

  it('ends a sign-in whose ending was missed: a read shows its server came up', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    api.listMcpServerStatus.mockResolvedValue([standing('s1', 'needs-sign-in')])
    const { s } = signedIn()
    await s.refresh()
    await s.signIn('s1')
    api.listMcpServerStatus.mockResolvedValue([standing('s1', 'connected')])
    await s.refresh()
    expect(s.getState().signIns).toEqual({})
  })

  it('drops a removed server’s sign-in', async () => {
    api.startMcpServerSignIn.mockResolvedValue(session('a'))
    api.removeMcpServer.mockResolvedValue(undefined)
    const { s } = signedIn()
    await s.signIn('s1')
    expect(await s.remove('s1')).toBe(true)
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
