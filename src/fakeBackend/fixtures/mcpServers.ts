import type {
  ListGroupMcpServersResponse,
  ListGroupMcpServerStatusResponse,
  ListProjectMcpServersResponse,
  ListProjectMcpServerStatusResponse,
} from '../../headless/api/generated/types.gen'
import { FAKE_GROUP_ID, FAKE_PROJECT_ID, MEMBERS } from './projects'

type McpServerRow = ListProjectMcpServersResponse[number]
type McpServerStanding = ListProjectMcpServerStatusResponse[number]
type McpOfferedTool = McpServerStanding['tools'][number]

const tool = (toolName: string, description: string, readOnly: boolean): McpOfferedTool => ({
  name: `fake_docs_${toolName}`,
  toolName,
  description,
  readOnly,
})

/** The server the group gives every project in it: signed in, and answering with its tools. */
export const FAKE_GROUP_MCP_SERVER: McpServerRow = {
  id: 'mcp-docs',
  name: 'Fake Docs',
  url: 'https://fake-docs.example.invalid/mcp',
  authType: 'oauth',
  hasCredential: true,
  onlyReads: true,
  source: 'group',
  groupId: FAKE_GROUP_ID,
}

/** The server one project keeps for itself: added, with no way in yet. */
export const FAKE_PROJECT_MCP_SERVER: McpServerRow = {
  id: 'mcp-tracker',
  name: 'Fake Tracker',
  url: 'https://fake-tracker.example.invalid/mcp',
  authType: 'bearer',
  hasCredential: false,
  onlyReads: false,
  source: 'project',
}

const DOCS_TOOLS = [
  tool('searchPages', 'Find pages by what they say.', true),
  tool('readPage', 'Read one page.', true),
]

const STANDINGS: Record<string, McpServerStanding> = {
  [FAKE_GROUP_MCP_SERVER.id]: {
    serverId: FAKE_GROUP_MCP_SERVER.id,
    status: 'connected',
    toolCount: DOCS_TOOLS.length,
    omittedTools: 0,
    tools: DOCS_TOOLS,
  },
  [FAKE_PROJECT_MCP_SERVER.id]: {
    serverId: FAKE_PROJECT_MCP_SERVER.id,
    status: 'needs-sign-in',
    toolCount: 0,
    omittedTools: 0,
    tools: [],
  },
}

const standingsOf = (rows: readonly McpServerRow[]): McpServerStanding[] =>
  rows.flatMap((row) => STANDINGS[row.id] ?? [])

/** A group's own servers; undefined for a group the fixtures do not hold. */
export function fakeGroupMcpServers(
  groupId: string | undefined,
): ListGroupMcpServersResponse | undefined {
  return groupId === FAKE_GROUP_ID ? [FAKE_GROUP_MCP_SERVER] : undefined
}

/** How a group's servers stand; undefined for a group the fixtures do not hold. */
export function fakeGroupMcpServerStatus(
  groupId: string | undefined,
): ListGroupMcpServerStatusResponse | undefined {
  const rows = fakeGroupMcpServers(groupId)
  return rows && standingsOf(rows)
}

/** A project's servers: its own first, then the ones its group gives it. */
export function fakeProjectMcpServers(
  projectId: string | undefined,
): ListProjectMcpServersResponse {
  return [
    ...(projectId === FAKE_PROJECT_ID ? [FAKE_PROJECT_MCP_SERVER] : []),
    ...(MEMBERS.some((member) => member.id === projectId) ? [FAKE_GROUP_MCP_SERVER] : []),
  ]
}

/** How each server a project lists stands, in the order it lists them. */
export function fakeProjectMcpServerStatus(
  projectId: string | undefined,
): ListProjectMcpServerStatusResponse {
  return standingsOf(fakeProjectMcpServers(projectId))
}
