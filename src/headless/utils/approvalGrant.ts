import { partitionGrants } from './agentQuestions'
import type { PendingToolGrant } from './chatTypes'
import type { GrantDetailView } from './approvalGrantTypes'
import { START_GROUP_WORK_TOOL_NAME } from './processGroupLaunchConstants'

/**
 * The tool that launches an isolated feature-work run. Kept as a named constant
 * so the approval surface can recognise it and present a launch affordance
 * rather than a generic "the agent wants to run a tool" prompt.
 */
export const START_FEATURE_WORK_TOOL_NAME = 'startFeatureWork'

/**
 * Longest note the launch approval accepts. Mirrors the backend's
 * `DECISION_NOTE_MAX_CHARS`, which silently cuts anything longer — so the field
 * stops the typist at the same point rather than letting the tail vanish.
 */
export const LAUNCH_NOTE_MAX_CHARS = 2000

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

/**
 * Whether a tool call's ask is decided on the row that shows it. A feature-work
 * or group launch is not, though it is gated like any tool call: approving it starts a
 * separate run, and the panel is where its launch options are chosen.
 */
export function isToolAskDecidedOnRow(toolName: string | undefined): boolean {
  return toolName !== START_FEATURE_WORK_TOOL_NAME && toolName !== START_GROUP_WORK_TOOL_NAME
}

export type StartFeatureWorkRunner = 'cli' | 'api'

/** How the dock should describe which agent will carry out the work. */
export type LaunchRunnerLabel = {
  /** The chip's text. */
  label: string
  /** The transport pill: 'CLI' or 'API'. */
  pill: string
  /** The hover callout. */
  tip: string
  /** True when the agent asked for a DIFFERENT executor than this chat's. */
  redirected: boolean
}

/**
 * Which agent actually runs the work.
 *
 * `startFeatureWork` omits `runner` almost always, and the backend then uses the
 * chat's own transport — "same agent as this chat" is true. But the tool DOES
 * accept an explicit runner, and stating "same agent as this chat" regardless
 * announced the wrong executor for a run the agent had deliberately routed
 * elsewhere.
 */
export function launchRunnerLabel(
  summary: Pick<StartFeatureWorkGrantSummary, 'runner'>,
  chatRunner: PendingToolGrant['chatRunner'],
): LaunchRunnerLabel {
  const chatPill = chatRunner === 'cli' ? 'CLI' : 'API'
  if (!summary.runner) {
    return {
      label: 'Same agent as this chat',
      pill: chatPill,
      tip: 'The run uses the same agent as this chat — the one that raised this ask.',
      redirected: false,
    }
  }
  const pill = summary.runner === 'cli' ? 'CLI' : 'API'
  if (pill === chatPill) {
    return {
      label: 'Same agent as this chat',
      pill,
      tip: 'The agent asked for this executor by name, and it is the one this chat is already using.',
      redirected: false,
    }
  }
  return {
    label: `On the ${pill} agent`,
    pill,
    tip: `The agent asked for the ${pill} agent specifically, which is NOT the one this chat is talking to.`,
    redirected: true,
  }
}

/** What the launch prompt shows about the work it is about to start. */
export type StartFeatureWorkGrantSummary = {
  storyId?: string
  /** The chat agent's own note for the run, when it wrote one. */
  note?: string
  /** Proof is on unless the agent explicitly asked for it off. */
  proofRequired: boolean
  /** Which agent the chat asked for; `undefined` means the same one as the chat. */
  runner?: StartFeatureWorkRunner
  /**
   * Project-note ids the run will be pointed at (a login for the screen under
   * test). Shown on the approval so you can see which stored notes this launch
   * sanctions the run to read — the ids resolve to labels where they render.
   */
  relevantNoteIds?: string[]
  /**
   * The process the agent chose to run instead of the story's own — what the
   * launch preview must resolve, so the plan read before approving is the one
   * that runs.
   */
  processId?: string
}

/**
 * Pull the human-facing bits out of a `startFeatureWork` ask's payload
 * (`{ tool, args }`), defensively — a malformed payload yields the defaults
 * rather than throwing, so the prompt still renders.
 */
export function startFeatureWorkGrantSummary(
  grant: Pick<PendingToolGrant, 'detail'>,
): StartFeatureWorkGrantSummary {
  const payload = grant.detail
  const wrapped =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>).args
      : undefined
  const record =
    typeof wrapped === 'object' && wrapped !== null ? (wrapped as Record<string, unknown>) : {}
  const storyId = record.storyId
  const note = record.note
  const runner = record.runner
  const processId = typeof record.processId === 'string' ? record.processId.trim() : ''
  const relevantNoteIds = Array.isArray(record.relevantNoteIds)
    ? record.relevantNoteIds.filter((x): x is string => typeof x === 'string' && x.length > 0)
    : []
  return {
    ...(typeof storyId === 'string' && storyId.length > 0 ? { storyId } : {}),
    ...(typeof note === 'string' && note.length > 0 ? { note } : {}),
    proofRequired: record.proofRequired !== false,
    ...(runner === 'cli' || runner === 'api' ? { runner } : {}),
    ...(relevantNoteIds.length > 0 ? { relevantNoteIds } : {}),
    ...(processId.length > 0 ? { processId } : {}),
  }
}

/**
 * The reason the server gave for refusing a launch preview — the same words the
 * launch itself would answer with (nothing is left to work). `undefined` when
 * the failure carried no reason.
 */
export function launchRefusalMessage(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const reason = (err as { error?: unknown }).error
  return typeof reason === 'string' && reason.trim().length > 0 ? reason : undefined
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
 * The approvals the bottom panel shows: requests of their own kind (a launch, a
 * sandbox boundary, a credential), plus any ordinary tool ask no row on screen
 * has claimed — an ask must never go unseen. An ordinary ask a row is showing
 * is decided there, whichever agent raised it.
 */
export function panelApprovalGrants(
  grants: PendingToolGrant[] | undefined,
  claimedIds: ReadonlySet<string>,
): PendingToolGrant[] {
  return pendingApprovalGrants(grants).filter((g) => g.inline !== true || !claimedIds.has(g.id))
}

/**
 * A grant's payload rendered for a human, or `undefined` when there is nothing
 * worth showing. Keeps the two clients' approval panels formatting the same
 * thing the same way; a payload that will not serialise degrades to its string
 * form rather than blanking the panel.
 */
/**
 * An ask's payload as its card reads it: the plain sentence the payload's
 * `detail` carries ("Delete the screen 'Evaluation' (3 items) from Viewer") as
 * the headline, and everything else as the details below it. Pure.
 */
export function grantDetailView(detail: unknown): GrantDetailView {
  if (typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
    const { detail: sentence, ...rest } = detail as Record<string, unknown>
    if (typeof sentence === 'string' && sentence.trim() !== '') {
      const remaining = Object.keys(rest).length > 0 ? formatGrantDetail(rest) : undefined
      return {
        headline: sentence.trim(),
        ...(remaining !== undefined ? { detail: remaining } : {}),
      }
    }
  }
  const formatted = formatGrantDetail(detail)
  return formatted !== undefined ? { detail: formatted } : {}
}

export function formatGrantDetail(detail: unknown): string | undefined {
  if (detail === undefined || detail === null) return undefined
  if (typeof detail === 'string') return detail.length > 0 ? detail : undefined
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}
