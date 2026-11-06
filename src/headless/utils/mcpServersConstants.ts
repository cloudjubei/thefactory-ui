import type {
  McpServerAuthType,
  McpServerDraft,
  McpServerStatusTone,
  McpServerStatusView,
  McpServersLayout,
} from './mcpServersTypes'

/** The event the backend sends when a server changes or a sign-in finishes. */
export const MCP_SERVERS_EVENT = 'mcpServers:updated'

/** Where a server's sign-in returns to, under the backend's own URL. */
export const MCP_SIGN_IN_CALLBACK_PATH = '/api/v1/mcp-servers/oauth/callback'

/** Longest name the backend keeps. */
export const MCP_SERVER_NAME_MAX = 64

export const MCP_SERVERS_LAYOUTS: readonly McpServersLayout[] = ['rows', 'folds', 'cards']

/** The layout that ships. */
export const MCP_SERVERS_DEFAULT_LAYOUT: McpServersLayout = 'rows'

export const MCP_SERVERS_LAYOUT_LABELS: Record<McpServersLayout, string> = {
  rows: 'Rows that open',
  folds: 'Rows that unfold',
  cards: 'Cards',
}

export const MCP_SERVERS_HEADING = 'MCP servers'

export const MCP_SERVERS_NONE_YET = 'No servers yet.'

export const MCP_SERVERS_LOADING = 'Loading…'

export const MCP_SERVERS_PROJECT_INTRO = (title: string): string =>
  `Outside tools for the agents in ${title}.`

export const MCP_SERVERS_MAIN_GROUP_INTRO = (title: string): string =>
  `Outside tools for agents in ${title}’s chats, and in every project whose main group it is.`

export const MCP_SERVERS_SCOPE_GROUP_INTRO = (title: string): string =>
  `Outside tools for agents in ${title}’s chats. Its projects get servers from their main group.`

export const MCP_SERVER_ACTIONS = {
  add: 'Add server',
  cancel: 'Cancel',
  signIn: 'Sign in',
  signInAgain: 'Sign in again',
  saveToken: 'Save token',
  test: 'Test',
  remove: 'Remove',
  openPage: 'Open it',
} as const

export const MCP_SERVER_FIELD_LABELS = {
  name: 'Name',
  url: 'URL',
  authType: 'Sign-in',
  token: 'Token',
} as const

export const MCP_SERVER_URL_PLACEHOLDER = 'https://example.com/mcp'

export const MCP_SERVER_NAME_HINT = 'Agents see this name.'

export const MCP_SERVER_AUTH_LABELS: Record<McpServerAuthType, string> = {
  oauth: 'In a browser',
  bearer: 'Token',
  none: 'None',
}

export const MCP_SERVER_AUTH_HINTS: Record<McpServerAuthType, string> = {
  oauth: 'You sign in once, in your browser.',
  bearer: 'You paste a token the server gave you.',
  none: 'Anyone can use this server.',
}

export const MCP_SERVER_AUTH_ORDER: readonly McpServerAuthType[] = ['oauth', 'bearer', 'none']

export const MCP_SERVER_EMPTY_DRAFT: McpServerDraft = { name: '', url: '', authType: 'oauth' }

export const MCP_SERVER_DRAFT_PROBLEMS = {
  name: 'Give it a name.',
  nameTooLong: `Keep the name under ${MCP_SERVER_NAME_MAX + 1} characters.`,
  nameTaken: 'A server here already has that name.',
  url: 'Add its URL.',
  notWeb: 'Use a full address, starting https://',
  notHttps: 'Use https. Plain http works only for localhost.',
  credentials: 'Take the user name and password out of the URL.',
  urlTaken: 'A server here already has that URL.',
} as const

export const MCP_SERVER_STATUS_LABELS: Record<McpServerStatusView, string> = {
  connected: 'Connected',
  'needs-sign-in': 'Needs sign-in',
  unreachable: 'Can’t reach it',
  checking: 'Checking…',
  unknown: 'Not checked',
}

export const MCP_SERVER_NEEDS_TOKEN_LABEL = 'Needs a token'

export const MCP_SERVER_STATUS_TONES: Record<McpServerStatusView, McpServerStatusTone> = {
  connected: 'done',
  'needs-sign-in': 'onhold',
  unreachable: 'stuck',
  checking: 'empty',
  unknown: 'empty',
}

export const MCP_SERVER_TOOLS_HEADING = 'Tools'

export const MCP_SERVER_ASKS_TAG = 'Asks first'

export const MCP_SERVER_TOOLS_HINT =
  'A tool that asks waits for your OK in a chat. Runs get only the tools that don’t ask.'

export const MCP_SERVER_NO_TOOLS = 'It offers no tools.'

export const MCP_SERVER_ONLY_READS_LABEL = 'This server only reads'

export const MCP_SERVER_ONLY_READS_HINT = 'Its tools run without asking you, and runs can use them.'

export const MCP_SERVER_SIGN_IN_PENDING = 'Finish in your browser. Nothing opened?'

export const MCP_SERVER_TOKEN_SAVED_HINT = 'A token is saved. Leave blank to keep it.'

export const MCP_SERVER_TOKEN_HINT = 'Stored safely. It is never shown again.'

export const MCP_SERVER_NOT_SIGNED_IN_NOTE =
  'This server wants a sign-in. Remove it and add it again with one.'

export const MCP_SERVER_FROM_GROUP = (group: string): string => `From ${group}`

export const MCP_SERVER_CHANGE_ON_GROUP = (group: string): string =>
  `Set up on ${group}. Change it in that group’s Settings.`

export const MCP_SERVER_UNNAMED_GROUP = 'its group'

export const MCP_SERVER_REMOVE_CONFIRM = (name: string): string =>
  `Agents here stop getting ${name}’s tools, and any sign-in for it is forgotten.`

export const MCP_SERVER_READ_FAILED = 'Could not read the MCP servers.'

export const MCP_SERVER_ADD_FAILED = 'Could not add the server.'

export const MCP_SERVER_REMOVE_FAILED = 'Could not remove the server.'

export const MCP_SERVER_TOKEN_FAILED = 'Could not save the token.'

export const MCP_SERVER_SIGN_IN_FAILED = 'Could not start the sign-in.'

export const MCP_SERVER_TEST_FAILED = 'Could not test the server.'

export const MCP_SERVER_EDIT_FAILED = 'Could not change the setting.'

export const MCP_SERVER_NO_BACKEND = 'Not connected to a backend yet.'

export const MCP_SERVER_BAD_SIGN_IN_PAGE = 'The server gave a sign-in page that can’t be opened.'
