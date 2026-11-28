import type { SignInSessionState } from 'thefactory-tools/types'
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
import {
  MCP_SERVER_ADD_FAILED,
  MCP_SERVER_EDIT_FAILED,
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
import { signInEndedNotice } from '../utils/signInSession'
import type { SignInSessionsStore } from './signInSessionsStore'

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
 * A token passes through to the backend and is never kept here. A sign-in shows
 * at once, is asked for once however often it is pressed, and its session is
 * shown inside the app; a press while it is open shows it again. Once the
 * session ends the servers are read again when it finished, and why is said
 * when it ran out or failed.
 */
export class McpServersStore {
  private _state: McpServersState = EMPTY
  private _reads = 0
  private readonly _listeners = new Set<() => void>()
  private readonly _owner: McpServerOwner
  private readonly _signIn: Pick<SignInSessionsStore, 'show' | 'onEnded'> | undefined
  /** Endings heard while a start is on its way: its session may be among them. */
  private _heard: SignInSessionState[] = []
  private _holders = 0
  private _disconnect: (() => void) | undefined = undefined

  constructor(owner: McpServerOwner, signIn?: Pick<SignInSessionsStore, 'show' | 'onEnded'>) {
    this._owner = owner
    this._signIn = signIn
  }

  /** Hear the endings of the sign-ins started here; returns the release. */
  retain = (): (() => void) => {
    this._holders += 1
    if (this._holders === 1) {
      this._disconnect = this._signIn?.onEnded((session) => this._ended(session))
    }
    let released = false
    return () => {
      if (released) return
      released = true
      this._holders -= 1
      if (this._holders === 0) {
        this._disconnect?.()
        this._disconnect = undefined
      }
    }
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

  /** A sign-in ended if its server came up. One already up, signing in again, waits for its session to end. */
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

  /** `mcpServers:updated`: read again. */
  onEvent = async (_event: McpServersEvent): Promise<void> => {
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

  /** Open a server's sign-in inside the app, or show the one open again. */
  signIn = async (serverId: string): Promise<void> => {
    const now = this._state.signIns[serverId]
    if (now?.step === 'starting') return
    if (now?.step === 'open') {
      this._signIn?.show(now.session)
      return
    }
    if (!this._starting()) this._heard = []
    this._set({
      signIns: { ...this._state.signIns, [serverId]: { step: 'starting' } },
      error: null,
    })
    let session: SignInSessionState
    try {
      session = await startMcpServerSignIn(this._owner, serverId)
    } catch (err) {
      this._set({
        signIns: without(this._state.signIns, serverId),
        error: extractErrorMessage(err, MCP_SERVER_SIGN_IN_FAILED),
      })
      return
    }
    const endedFirst = this._heard.find((heard) => heard.id === session.id)
    this._set({ signIns: { ...this._state.signIns, [serverId]: { step: 'open', session } } })
    if (!this._starting()) this._heard = []
    if (endedFirst) this._ended(endedFirst)
    else this._signIn?.show(session)
  }

  private _starting(): boolean {
    return Object.values(this._state.signIns).some((signIn) => signIn.step === 'starting')
  }

  private _ended(session: SignInSessionState): void {
    const serverId = Object.entries(this._state.signIns).find(
      ([, signIn]) => signIn.step === 'open' && signIn.session.id === session.id,
    )?.[0]
    if (!serverId) {
      if (this._starting()) this._heard.push(session)
      return
    }
    const why = signInEndedNotice(session)
    this._set({
      signIns: without(this._state.signIns, serverId),
      ...(why ? { error: why } : {}),
    })
    if (session.status === 'finished') void this.refresh()
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
