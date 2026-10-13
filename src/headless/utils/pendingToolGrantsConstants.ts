import { MCP_TOOL_CALL_ACTION_KIND } from 'thefactory-tools/constants'

/**
 * The action kinds raised for an ordinary tool call, decided on the call's own
 * row: an MCP tool call, and the host tools that raise their ask under a kind
 * of their own only to keep their standing grants apart. A boundary (network,
 * a host path, an install) and a request with a card of its own (a launch, a
 * git change, a run proposal, a message to another chat, a new file) stay on
 * the approval panel.
 */
export const ROW_DECIDED_ACTION_KINDS: readonly string[] = [
  MCP_TOOL_CALL_ACTION_KIND,
  'project-note-read',
]

/** The asks about a website — what "Trust this site" may answer. */
export const SITE_ASK_KINDS: readonly string[] = ['network-unlock', 'external-fetch']
