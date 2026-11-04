import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useApi } from '../api/ApiContext'
import { useAuth } from '../api/AuthContext'
import { useProjects } from '../contexts/ProjectsContext'
import { useProjectsGroups } from '../contexts/ProjectsGroupsContext'
import { mcpServersIntro, mcpServerViews } from '../utils/mcpServers'
import { MCP_SERVERS_EVENT } from '../utils/mcpServersConstants'
import type {
  McpServerInput,
  McpServerOwner,
  McpServerRow,
  McpServersEvent,
  McpServerView,
} from '../utils/mcpServersTypes'
import { McpServersStore } from './mcpServersStore'

export type UseMcpServers = {
  /** What to show of each server; undefined until they are read. */
  views: McpServerView[] | undefined
  /** The servers kept here, not those a project gets from its group. */
  ownRows: McpServerRow[]
  intro: string
  error: string | null
  busy: boolean
  add: (input: McpServerInput) => Promise<McpServerRow | undefined>
  remove: (serverId: string) => Promise<boolean>
  setToken: (serverId: string, token: string) => Promise<boolean>
  signIn: (serverId: string) => Promise<string | undefined>
  test: (serverId: string) => Promise<void>
  refresh: () => Promise<void>
}

const ownerKey = (owner: McpServerOwner): string =>
  owner.kind === 'project' ? `project:${owner.projectId}` : `group:${owner.groupId}`

/**
 * A project's or a group's MCP servers, kept current as they change. There is no
 * event for a sign-in that failed, so a client also calls `refresh` when it
 * regains focus.
 */
export function useMcpServers(owner: McpServerOwner): UseMcpServers {
  const { token } = useAuth()
  const { ws, apiBaseUrl } = useApi()
  const { groups } = useProjectsGroups()
  const { projects } = useProjects()
  const key = ownerKey(owner)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => new McpServersStore(owner, () => apiBaseUrl), [key, apiBaseUrl])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  useEffect(() => {
    if (token) void store.refresh()
  }, [token, store])

  useEffect(() => {
    if (!token) return
    return ws.on<McpServersEvent>(MCP_SERVERS_EVENT, (event) => void store.onEvent(event))
  }, [ws, token, store])

  useEffect(() => {
    if (!token) return
    return ws.onReconnect(() => void store.refresh())
  }, [ws, token, store])

  const refresh = useCallback(() => store.refresh(), [store])

  const groupTitles = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.id, g.title])),
    [groups],
  )
  const views = useMemo(
    () =>
      state.rows &&
      mcpServerViews({
        owner,
        rows: state.rows,
        standings: state.standings,
        statusFailed: state.statusFailed,
        tests: state.tests,
        testing: state.testing,
        signIns: state.signIns,
        groupTitles,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, state, groupTitles],
  )
  const ownRows = useMemo(
    () => (state.rows ?? []).filter((row) => owner.kind === 'group' || row.source === 'project'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, state.rows],
  )

  const group = owner.kind === 'group' ? groups.find((g) => g.id === owner.groupId) : undefined
  const project =
    owner.kind === 'project' ? projects.find((p) => p.id === owner.projectId) : undefined

  return {
    views,
    ownRows,
    intro: mcpServersIntro(owner, group?.title ?? project?.title ?? '', group?.type),
    error: state.error,
    busy: state.busy,
    add: store.add,
    remove: store.remove,
    setToken: store.setToken,
    signIn: store.signIn,
    test: store.test,
    refresh,
  }
}
