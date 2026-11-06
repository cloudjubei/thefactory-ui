import type { AgentTypeOwner } from './agentTypeSettingsTypes'

/** The project or the group whose MCP servers these are. */
export type McpServerOwner = AgentTypeOwner

export type McpServerAuthType = 'none' | 'bearer' | 'oauth'

export type McpServerStatus = 'connected' | 'needs-sign-in' | 'unreachable'

/** A server as the backend lists it. It names no credential: `hasCredential` is all a client learns. */
export type McpServerRow = {
  id: string
  name: string
  url: string
  authType: McpServerAuthType
  hasCredential: boolean
  /** The person says it only reads: its tools run without asking, and runs get them. */
  onlyReads: boolean
  source: 'project' | 'group'
  groupId?: string
}

/** A tool a server offers agents. Its name and description come from the server: plain text only. */
export type McpOfferedTool = {
  name: string
  toolName: string
  description: string
  readOnly: boolean
}

/** How a server stands and what it offers, from recent answers. */
export type McpServerStanding = {
  serverId: string
  status: McpServerStatus
  reason?: string
  toolCount: number
  omittedTools: number
  tools: McpOfferedTool[]
}

/** What a server said when asked just now. */
export type McpServerTestResult = {
  status: McpServerStatus
  reason?: string
  tools: Array<{ name: string; description?: string; readOnly: boolean }>
}

export type McpServerInput = { name: string; url: string; authType: McpServerAuthType }

/** What a server's edit may change. */
export type McpServerEdit = Partial<McpServerInput> & { onlyReads?: boolean }

/** The event `mcpServers:updated` carries. `signed-in` names no owner: refetch whatever is showing. */
export type McpServersEvent =
  | { action: 'signed-in' }
  | {
      action: 'added' | 'updated' | 'removed'
      serverId: string
      groupId?: string
      projectId?: string
    }

export type McpServerDraft = { name: string; url: string; authType: McpServerAuthType }

/** Where a server's sign-in stands in this client: a page opened in the browser, not finished yet. */
export type McpServerSignIns = Readonly<Record<string, string>>

export type McpServersState = {
  /** The servers; undefined until they are read. */
  rows: McpServerRow[] | undefined
  /** How they stand; undefined until that is read. */
  standings: McpServerStanding[] | undefined
  /** The status could not be read, so it is not known. */
  statusFailed: boolean
  /** Answers to Test, by server, until the next read. */
  tests: Readonly<Record<string, McpServerTestResult>>
  /** The servers a Test is waiting on. */
  testing: readonly string[]
  /** Sign-ins started here and not finished, by server: the page to open. */
  signIns: McpServerSignIns
  busy: boolean
  /** Why the last read or change failed, in the backend's words. */
  error: string | null
}

export type McpServerStatusTone = 'done' | 'onhold' | 'stuck' | 'empty'

export type McpServerStatusView = 'checking' | 'unknown' | McpServerStatus

export type McpToolView = {
  /** Its name on the server. */
  name: string
  description: string
  asks: boolean
}

/** The one way to get a server working, if there is one here. */
export type McpServerAccess =
  | { kind: 'sign-in'; label: string; pendingUrl?: string }
  | { kind: 'token'; saved: boolean }

export type McpServerView = {
  id: string
  name: string
  url: string
  /** The address, short enough for a row. */
  host: string
  status: McpServerStatusView
  statusLabel: string
  statusTone: McpServerStatusTone
  /** Why it stands as it does, in the server's or backend's words. */
  reason?: string
  /** What the person can do about it, when nothing here can fix it. */
  note?: string
  /** It is changed on its group: this project can only look and test. */
  readOnly: boolean
  /** The person says it only reads. Changed only where `readOnly` is false. */
  onlyReads: boolean
  /** The group it comes from, on a project. */
  sourceLabel?: string
  access?: McpServerAccess
  /** Those that ask come first. */
  tools: McpToolView[]
  toolsSummary?: string
  omittedNote?: string
  testing: boolean
  testSummary?: string
}

/** How the section lays its servers out. */
export type McpServersLayout = 'rows' | 'folds' | 'cards'
