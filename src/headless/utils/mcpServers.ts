import {
  MCP_SERVER_CHANGE_ON_GROUP,
  MCP_SERVER_DRAFT_PROBLEMS,
  MCP_SERVER_FROM_GROUP,
  MCP_SERVER_NAME_MAX,
  MCP_SERVER_NEEDS_TOKEN_LABEL,
  MCP_SERVER_NOT_SIGNED_IN_NOTE,
  MCP_SERVER_NO_TOOLS,
  MCP_SERVER_STATUS_LABELS,
  MCP_SERVER_STATUS_TONES,
  MCP_SERVER_UNNAMED_GROUP,
  MCP_SERVER_ACTIONS,
  MCP_SERVERS_MAIN_GROUP_INTRO,
  MCP_SERVERS_PROJECT_INTRO,
  MCP_SERVERS_SCOPE_GROUP_INTRO,
  MCP_SIGN_IN_CALLBACK_PATH,
} from './mcpServersConstants'
import type {
  McpServerAccess,
  McpServerDraft,
  McpServerInput,
  McpServerOwner,
  McpServerRow,
  McpServerSignIns,
  McpServerStanding,
  McpServerStatus,
  McpServerStatusView,
  McpServerTestResult,
  McpServerView,
  McpToolView,
} from './mcpServersTypes'

/** React Native's `URL` has no `hostname`, so a server's address is read by hand. */
const WEB_ADDRESS = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i

const sameText = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

const sameAddress = (a: string, b: string): boolean =>
  sameText(a.replace(/\/+\s*$/, ''), b.replace(/\/+\s*$/, ''))

/** The URL a sign-in returns to, as the browser doing it reaches this backend. */
export function mcpSignInRedirectUrl(backendUrl: string | null | undefined): string | undefined {
  const base = backendUrl?.trim().replace(/\/+$/, '')
  return base ? `${base}${MCP_SIGN_IN_CALLBACK_PATH}` : undefined
}

/** A page a browser may be sent to. Its address comes from an outside server, and desktop and mobile hand it to the OS. */
export function isMcpSignInPage(url: string): boolean {
  return /^https?:\/\/[^/?#]/i.test(url)
}

/** What the section says it is for, on a project or a group. */
export function mcpServersIntro(
  owner: McpServerOwner,
  title: string,
  groupType: string | undefined,
): string {
  if (owner.kind === 'project') return MCP_SERVERS_PROJECT_INTRO(title)
  return groupType === 'MAIN'
    ? MCP_SERVERS_MAIN_GROUP_INTRO(title)
    : MCP_SERVERS_SCOPE_GROUP_INTRO(title)
}

/** A server's address without its scheme or path. */
export function mcpServerHost(url: string): string {
  return WEB_ADDRESS.exec(url.trim())?.[2] || url
}

function urlProblem(text: string): string | undefined {
  const [, scheme = '', authority = ''] = WEB_ADDRESS.exec(text) ?? []
  const secure = scheme.toLowerCase() === 'https'
  if (!authority || (!secure && scheme.toLowerCase() !== 'http')) {
    return MCP_SERVER_DRAFT_PROBLEMS.notWeb
  }
  if (authority.includes('@')) return MCP_SERVER_DRAFT_PROBLEMS.credentials
  return secure || LOOPBACK_HOST.test(authority) ? undefined : MCP_SERVER_DRAFT_PROBLEMS.notHttps
}

/** What stops a new server being added, in plain words; `own` is what the owner already keeps. */
export function mcpServerDraftProblem(
  draft: McpServerDraft,
  own: readonly McpServerRow[],
): string | undefined {
  const name = draft.name.trim()
  const url = draft.url.trim()
  if (!name) return MCP_SERVER_DRAFT_PROBLEMS.name
  if (name.length > MCP_SERVER_NAME_MAX) return MCP_SERVER_DRAFT_PROBLEMS.nameTooLong
  if (!url) return MCP_SERVER_DRAFT_PROBLEMS.url
  const problem = urlProblem(url)
  if (problem) return problem
  if (own.some((server) => sameText(server.name, name))) return MCP_SERVER_DRAFT_PROBLEMS.nameTaken
  if (own.some((server) => sameAddress(server.url, url))) return MCP_SERVER_DRAFT_PROBLEMS.urlTaken
  return undefined
}

export function mcpServerInputOf(draft: McpServerDraft): McpServerInput {
  return { name: draft.name.trim(), url: draft.url.trim(), authType: draft.authType }
}

/** How many tools there are and how many ask. */
export function mcpToolsSummary(tools: readonly McpToolView[]): string {
  const total = tools.length
  const asks = tools.filter((tool) => tool.asks).length
  const count = `${total} ${total === 1 ? 'tool' : 'tools'}`
  if (asks === 0) return count
  if (asks === total) return `${count}, ${total === 1 ? 'it asks' : 'all ask'} first`
  return `${count}, ${asks} ${asks === 1 ? 'asks' : 'ask'} first`
}

function toolViews(
  standing: McpServerStanding | undefined,
  test: McpServerTestResult | undefined,
): McpToolView[] {
  if (test && test.status !== 'connected') return []
  const offered = (standing?.tools ?? []).map((tool) => ({
    name: tool.toolName,
    description: tool.description,
    asks: !tool.readOnly,
  }))
  const tools =
    offered.length > 0
      ? offered
      : (test?.tools ?? []).map((tool) => ({
          name: tool.name,
          description: tool.description ?? '',
          asks: !tool.readOnly,
        }))
  return [...tools.filter((tool) => tool.asks), ...tools.filter((tool) => !tool.asks)]
}

function statusOf(
  answer: { status: McpServerStatus } | undefined,
  statusRead: boolean,
  statusFailed: boolean,
): McpServerStatusView {
  if (answer) return answer.status
  return statusRead || statusFailed ? 'unknown' : 'checking'
}

function accessOf(row: McpServerRow, status: McpServerStatusView, pendingUrl?: string) {
  if (row.authType === 'bearer') {
    return { kind: 'token', saved: row.hasCredential } satisfies McpServerAccess
  }
  if (row.authType === 'none') return undefined
  const signedIn = row.hasCredential && status !== 'needs-sign-in'
  return {
    kind: 'sign-in',
    label: signedIn ? MCP_SERVER_ACTIONS.signInAgain : MCP_SERVER_ACTIONS.signIn,
    ...(pendingUrl ? { pendingUrl } : {}),
  } satisfies McpServerAccess
}

function testSummaryOf(row: McpServerRow, test: McpServerTestResult, tools: McpToolView[]): string {
  if (test.status === 'unreachable') return 'Can’t reach it just now.'
  if (test.status === 'needs-sign-in') {
    return row.authType === 'bearer' ? 'It wants a token.' : 'It wants a sign-in.'
  }
  return `Connected just now. ${tools.length > 0 ? `${mcpToolsSummary(tools)}.` : MCP_SERVER_NO_TOOLS}`
}

const omittedNoteOf = (omitted: number | undefined): string | undefined => {
  if (!omitted) return undefined
  return omitted === 1
    ? '1 more tool left out: agents can’t use it.'
    : `${omitted} more tools left out: agents can’t use them.`
}

export type McpServerViewsInput = {
  owner: McpServerOwner
  rows: readonly McpServerRow[]
  standings: readonly McpServerStanding[] | undefined
  statusFailed?: boolean
  tests?: Readonly<Record<string, McpServerTestResult>>
  testing?: readonly string[]
  signIns?: McpServerSignIns
  /** Group titles by id, for the servers a project gets from its group. */
  groupTitles?: Readonly<Record<string, string>>
}

/** What the section shows of each server, a test's answer over the recent status. */
export function mcpServerViews({
  owner,
  rows,
  standings,
  statusFailed = false,
  tests = {},
  testing = [],
  signIns = {},
  groupTitles = {},
}: McpServerViewsInput): McpServerView[] {
  return rows.map((row) => {
    const standing = standings?.find((s) => s.serverId === row.id)
    const test = tests[row.id]
    const answer = test ?? standing
    const status = statusOf(answer, standings !== undefined, statusFailed)
    const tools = toolViews(standing, test)
    const readOnly = owner.kind === 'project' && row.source === 'group'
    const group = (row.groupId && groupTitles[row.groupId]) || MCP_SERVER_UNNAMED_GROUP
    const access = readOnly ? undefined : accessOf(row, status, signIns[row.id])
    const stranded = row.authType === 'none' && status === 'needs-sign-in'
    const note = readOnly
      ? MCP_SERVER_CHANGE_ON_GROUP(group)
      : stranded
        ? MCP_SERVER_NOT_SIGNED_IN_NOTE
        : undefined
    const omittedNote = status === 'connected' ? omittedNoteOf(standing?.omittedTools) : undefined
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      host: mcpServerHost(row.url),
      status,
      statusLabel:
        status === 'needs-sign-in' && row.authType === 'bearer'
          ? MCP_SERVER_NEEDS_TOKEN_LABEL
          : MCP_SERVER_STATUS_LABELS[status],
      statusTone: MCP_SERVER_STATUS_TONES[status],
      readOnly,
      onlyReads: row.onlyReads === true,
      testing: testing.includes(row.id),
      tools,
      ...(answer?.reason ? { reason: answer.reason } : {}),
      ...(note ? { note } : {}),
      ...(readOnly ? { sourceLabel: MCP_SERVER_FROM_GROUP(group) } : {}),
      ...(access ? { access } : {}),
      ...(status === 'connected'
        ? { toolsSummary: tools.length > 0 ? mcpToolsSummary(tools) : MCP_SERVER_NO_TOOLS }
        : {}),
      ...(omittedNote ? { omittedNote } : {}),
      ...(test ? { testSummary: testSummaryOf(row, test, tools) } : {}),
    }
  })
}
