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
 * The lone launch approval a chat is waiting on, or `null`.
 *
 * Returns the grant only when the chat's pending PERMISSION grants (questions
 * excluded — they render as their own card) are exactly one AND it is a launch.
 * The single source of truth for the inline launch panel and for the permission
 * modal that must suppress it: one predicate, two consumers, so the launch is
 * never rendered twice. A launch alongside other permission grants stays in the
 * generic modal — a bespoke panel for one of several would hide the rest.
 */
export function soleLaunchGrant(grants?: PendingToolGrant[]): PendingToolGrant | null {
  const permissions = partitionGrants(grants).permissions
  return permissions.length === 1 && isStartFeatureWorkGrant(permissions[0]) ? permissions[0] : null
}
