import { partitionGrants } from './agentQuestions'
import type { PendingToolGrant } from './chatTypes'

/**
 * The tool that launches an isolated feature-work run. Kept as a named constant
 * so the approval surface can recognise it and present a launch affordance
 * rather than a generic "the agent wants to run a tool" prompt.
 */
export const START_FEATURE_WORK_TOOL_NAME = 'startFeatureWork'

/**
 * Whether a grant is the request to LAUNCH an isolated feature-work run.
 *
 * In a chat this asks by design — starting the work is an action, and the chat
 * agent asks before it acts. But it is not an ordinary tool grant: approving it
 * spins up a sandboxed run that works on a review branch, which is exactly the
 * thing the user's "start the work" meant. So the prompt should read as
 * "Approve & launch", not as a raw `startFeatureWork(...)` tool card.
 */
export function isStartFeatureWorkGrant(grant: Pick<PendingToolGrant, 'toolName'>): boolean {
  return grant.toolName === START_FEATURE_WORK_TOOL_NAME
}

/** What the launch prompt shows about the work it is about to start. */
export type StartFeatureWorkGrantSummary = {
  storyId?: string
  note?: string
}

/**
 * Pull the human-facing bits out of a `startFeatureWork` grant's payload
 * (`{ tool, args: { storyId, note } }`), defensively — a malformed payload
 * yields an empty summary rather than throwing, so the prompt still renders.
 */
export function startFeatureWorkGrantSummary(
  grant: Pick<PendingToolGrant, 'detail'>,
): StartFeatureWorkGrantSummary {
  const payload = grant.detail
  if (typeof payload !== 'object' || payload === null) return {}
  const args = (payload as { args?: unknown }).args
  if (typeof args !== 'object' || args === null) return {}
  const storyId = (args as { storyId?: unknown }).storyId
  const note = (args as { note?: unknown }).note
  return {
    ...(typeof storyId === 'string' && storyId.length > 0 ? { storyId } : {}),
    ...(typeof note === 'string' && note.length > 0 ? { note } : {}),
  }
}

/**
 * Every approval a chat is currently waiting on, in raise order.
 *
 * Questions are excluded — they render as their own card. Everything else, of
 * whatever tool, is a decision blocking the agent and belongs inline in the
 * composer's place where it is unmissable and the conversation stays visible.
 *
 * Returns a LIST, not "the lone one". Approvals genuinely arrive in twos: an ask
 * outlives the turn that raised it, so a later turn's ask stacks on top of one
 * the user has not answered yet. Rendering only the singleton case sent exactly
 * those pile-ups to a modal that covered the chat — the surface the user asked
 * us to get rid of. There is no modal fallback any more; the panel stacks them.
 */
export function pendingApprovalGrants(grants?: PendingToolGrant[]): PendingToolGrant[] {
  return partitionGrants(grants).permissions
}

/**
 * A grant's payload rendered for a human, or `undefined` when there is nothing
 * worth showing. Keeps the two clients' approval panels formatting the same
 * thing the same way; a payload that will not serialise degrades to its string
 * form rather than blanking the panel.
 */
export function formatGrantDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) return undefined
  if (typeof detail === 'string') return detail.length > 0 ? detail : undefined
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}
