import type {
  McpServerEdit,
  McpServerInput,
  McpServerOwner,
  McpServerRow,
  McpServerStanding,
  McpServerTestResult,
} from '../utils/mcpServersTypes'
import { client } from './generated/client.gen'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const ownerBase = (owner: McpServerOwner): string =>
  owner.kind === 'group'
    ? `/api/v1/projects-groups/${encodeURIComponent(owner.groupId)}/mcp-servers`
    : `/api/v1/projects/${encodeURIComponent(owner.projectId)}/mcp-servers`

const serverBase = (owner: McpServerOwner, serverId: string): string =>
  `${ownerBase(owner)}/${encodeURIComponent(serverId)}`

/** An owner's servers. Written by hand until the SDK is generated from these routes. */
export async function listMcpServers(owner: McpServerOwner): Promise<McpServerRow[]> {
  const { data } = await client.get({ url: ownerBase(owner), throwOnError: true })
  return data as McpServerRow[]
}

export async function listMcpServerStatus(owner: McpServerOwner): Promise<McpServerStanding[]> {
  const { data } = await client.get({ url: `${ownerBase(owner)}/status`, throwOnError: true })
  return data as McpServerStanding[]
}

export async function addMcpServer(
  owner: McpServerOwner,
  input: McpServerInput,
): Promise<McpServerRow> {
  const { data } = await client.post({
    url: ownerBase(owner),
    body: input,
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as McpServerRow
}

export async function editMcpServer(
  owner: McpServerOwner,
  serverId: string,
  edit: McpServerEdit,
): Promise<McpServerRow> {
  const { data } = await client.patch({
    url: serverBase(owner, serverId),
    body: edit,
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return data as McpServerRow
}

export async function removeMcpServer(owner: McpServerOwner, serverId: string): Promise<void> {
  await client.delete({ url: serverBase(owner, serverId), throwOnError: true })
}

export async function setMcpServerToken(
  owner: McpServerOwner,
  serverId: string,
  token: string,
): Promise<void> {
  await client.put({
    url: `${serverBase(owner, serverId)}/token`,
    body: { token },
    headers: JSON_HEADERS,
    throwOnError: true,
  })
}

/** Start a sign-in; answers the page to open in the person's browser. */
export async function startMcpServerSignIn(
  owner: McpServerOwner,
  serverId: string,
  redirectUrl: string,
): Promise<string> {
  const { data } = await client.post({
    url: `${serverBase(owner, serverId)}/sign-in`,
    body: { redirectUrl },
    headers: JSON_HEADERS,
    throwOnError: true,
  })
  return (data as { authorizationUrl: string }).authorizationUrl
}

export async function testMcpServer(
  owner: McpServerOwner,
  serverId: string,
): Promise<McpServerTestResult> {
  const { data } = await client.post({
    url: `${serverBase(owner, serverId)}/test`,
    throwOnError: true,
  })
  return data as McpServerTestResult
}
