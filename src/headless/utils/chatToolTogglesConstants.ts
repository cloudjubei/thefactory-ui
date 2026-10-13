/** The one line under a chat's Tools heading — the same whichever model runs the chat. */
export const CHAT_TOOLS_HINT =
  'The factory tools this chat’s agent can call, whichever model runs it. An agent’s own built-in tools — a CLI’s file and shell tools — are bounded by its sandbox, not by this list.'

/**
 * How long a transport's tool catalogue stays current after the last chat
 * settings panel showing it closed — reopening a chat within it reads nothing.
 */
export const CHAT_TOOL_CATALOG_LINGER_MS = 5 * 60_000
