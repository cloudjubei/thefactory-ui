import { extractErrorMessage } from '../api/errorMessage'
import {
  addMcpServer,
  editMcpServer,
  listMcpServers,
  listMcpServerStatus,
  removeMcpServer,
  setMcpServerToken,
  startMcpServerSignIn,
  testMcpServer,
} from '../api/mcpServersApi'
import { isMcpSignInPage, mcpSignInRedirectUrl } from '../utils/mcpServers'
import {
  MCP_SERVER_ADD_FAILED,
  MCP_SERVER_BAD_SIGN_IN_PAGE,
  MCP_SERVER_EDIT_FAILED,
  MCP_SERVER_NO_BACKEND,
  MCP_SERVER_READ_FAILED,
  MCP_SERVER_REMOVE_FAILED,
  MCP_SERVER_SIGN_IN_FAILED,
  MCP_SERVER_TEST_FAILED,
  MCP_SERVER_TOKEN_FAILED,
} from '../utils/mcpServersConstants'
import type {
  McpServerInput,
  McpServerOwner,
  McpServerRow,
  McpServersEvent,
  McpServersState,
  McpServerStanding,
} from '../utils/mcpServersTypes'

const EMPTY: McpServersState = {
  rows: undefined,
  standings: undefined,
  statusFailed: false,
  tests: {},
  testing: [],
  signIns: {},
  busy: false,
  error: null,
}

const without = <T>(map: Readonly<Record<string, T>>, key: string): Record<string, T> => {
  const { [key]: _gone, ...rest } = map
  return rest
}

/**
 * One owner's MCP servers as its Settings show them: the list first, the status
 * when it comes in (it can take seconds), and every read again after a change.
 * A token passes through to the backend and is never kept here.
 */
export class McpServersStore {
  private _state: McpServersState = EMPTY
  private _reads = 0
  private readonly _listeners = new Set<() => void>()
  private readonly _owner: McpServerOwner
  private readonly _backendUrl: () => string | null | undefined

  constructor(owner: McpServerOwner, backendUrl: () => string | null | undefined) {
    this._owner = owner
    this._backendUrl = backendUrl
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  getState = (): McpServersState => this._state

  private _set(patch: Partial<McpServersState>): void {
    this._state = { ...this._state, ...patch }
    for (const listener of this._listeners) listener()
  }

  /** Read the list and the status again. A read a newer one overtook is dropped. */
  refresh = async (): Promise<void> => {
    const read = ++this._reads
    const testedBefore = this._state.tests
    const isCurrent = () => read === this._reads
    await Promise.all([this._readRows(isCurrent), this._readStatus(isCurrent, testedBefore)])
  }

  private async _readRows(isCurrent: () => boolean): Promise<void> {
    try {
      const rows = await listMcpServers(this._owner)
      if (isCurrent()) this._set({ rows, error: null })
    } catch (err) {
      if (isCurrent()) this._set({ error: extractErrorMessage(err, MCP_SERVER_READ_FAILED) })
    }
  }

  private async _readStatus(
    isCurrent: () => boolean,
    testedBefore: McpServersState['tests'],
  ): Promise<void> {
    try {
      const standings = await listMcpServerStatus(this._owner)
      if (!isCurrent()) return
      this._set({
        standings,
        statusFailed: false,
        tests: this._testsSince(testedBefore),
        signIns: this._signInsAfter(standings),
      })
    } catch {
      if (isCurrent()) this._set({ standings: undefined, statusFailed: true })
    }
  }

  /** The answers that came in after the read began: it may not have seen them. */
  private _testsSince(before: McpServersState['tests']): McpServersState['tests'] {
    return Object.fromEntries(
      Object.entries(this._state.tests).filter(([id, answer]) => before[id] !== answer),
    )
  }

  /** A sign-in ended if its server came up. One already up, signing in again, waits for the event. */
  private _signInsAfter(standings: readonly McpServerStanding[]): McpServersState['signIns'] {
    const isUp = (list: readonly McpServerStanding[] | undefined, id: string) =>
      list?.some((s) => s.serverId === id && s.status === 'connected') ?? false
    const before = this._state.standings
    return Object.fromEntries(
      Object.entries(this._state.signIns).filter(
        ([id]) => isUp(before, id) || !isUp(standings, id),
      ),
    )
  }

  /** `mcpServers:updated`. `signed-in` names no server, so it ends every sign-in waiting here. */
  onEvent = async (event: McpServersEvent): Promise<void> => {
    if (event.action === 'signed-in') this._set({ signIns: {} })
    await this.refresh()
  }

  private async _change<T>(change: () => Promise<T>, fallback: string): Promise<T | undefined> {
    this._set({ busy: true, error: null })
    try {
      const result = await change()
      await this.refresh()
      return result
    } catch (err) {
      this._set({ error: extractErrorMessage(err, fallback) })
      return undefined
    } finally {
      this._set({ busy: false })
    }
  }

  /** Add a server; answers its row, or nothing when it was refused. */
  add = (input: McpServerInput): Promise<McpServerRow | undefined> =>
    this._change(() => addMcpServer(this._owner, input), MCP_SERVER_ADD_FAILED)

  remove = async (serverId: string): Promise<boolean> => {
    const done = await this._change(async () => {
      await removeMcpServer(this._owner, serverId)
      this._set({
        tests: without(this._state.tests, serverId),
        signIns: without(this._state.signIns, serverId),
      })
      return true
    }, MCP_SERVER_REMOVE_FAILED)
    return done === true
  }

  /** The person's word that a server only reads, or its withdrawal; answers whether it was kept. */
  setOnlyReads = async (serverId: string, onlyReads: boolean): Promise<boolean> => {
    const done = await this._change(async () => {
      await editMcpServer(this._owner, serverId, { onlyReads })
      return true
    }, MCP_SERVER_EDIT_FAILED)
    return done === true
  }

  /** Save a token. Blank means keep the one stored. A refusal's words are not shown: they could echo it. */
  setToken = async (serverId: string, token: string): Promise<boolean> => {
    const typed = token.trim()
    if (!typed) return false
    this._set({ busy: true, error: null })
    try {
      await setMcpServerToken(this._owner, serverId, typed)
      await this.refresh()
      return true
    } catch {
      this._set({ error: MCP_SERVER_TOKEN_FAILED })
      return false
    } finally {
      this._set({ busy: false })
    }
  }

  /** Start a sign-in; answers the page to open, or nothing when it cannot start. */
  signIn = async (serverId: string): Promise<string | undefined> => {
    const redirectUrl = mcpSignInRedirectUrl(this._backendUrl())
    if (!redirectUrl) {
      this._set({ error: MCP_SERVER_NO_BACKEND })
      return undefined
    }
    this._set({ busy: true, error: null })
    try {
      const page = await startMcpServerSignIn(this._owner, serverId, redirectUrl)
      if (!isMcpSignInPage(page)) {
        this._set({ error: MCP_SERVER_BAD_SIGN_IN_PAGE })
        return undefined
      }
      this._set({ signIns: { ...this._state.signIns, [serverId]: page } })
      return page
    } catch (err) {
      this._set({ error: extractErrorMessage(err, MCP_SERVER_SIGN_IN_FAILED) })
      return undefined
    } finally {
      this._set({ busy: false })
    }
  }

  /** Ask the server now. */
  test = async (serverId: string): Promise<void> => {
    this._set({ testing: [...this._state.testing, serverId], error: null })
    try {
      const answer = await testMcpServer(this._owner, serverId)
      this._set({ tests: { ...this._state.tests, [serverId]: answer } })
    } catch (err) {
      this._set({
        tests: without(this._state.tests, serverId),
        error: extractErrorMessage(err, MCP_SERVER_TEST_FAILED),
      })
    } finally {
      this._set({ testing: this._state.testing.filter((id) => id !== serverId) })
    }
  }
}
