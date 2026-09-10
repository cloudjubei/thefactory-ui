import type { Feature, Story } from '../api/generated'
import { partitionGrants } from './agentQuestions'
import type { PendingToolGrant } from './chatTypes'

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

export type StartFeatureWorkRunner = 'cli' | 'api'

/**
 * Whether choices made at the approval actually reach the run.
 *
 * Only a CLI-brokered decision carries metadata: `decideCliAgentAction` persists
 * it and the backend merges the whitelisted options into the launch. The API
 * transport confirms tool calls by ID alone, so the agent's own arguments are
 * what runs. Offering an editable note or proof toggle there would collect a
 * decision and silently drop it, which is worse than not offering it.
 */
export function launchOptionsAreHonoured(grant: Pick<PendingToolGrant, 'source'>): boolean {
  return grant.source === 'cli'
}

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
  source: PendingToolGrant['source'],
): LaunchRunnerLabel {
  const chatPill = source === 'cli' ? 'CLI' : 'API'
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

/** Why the launch options are read-only on a transport that cannot carry them. */
export const LAUNCH_OPTIONS_READ_ONLY =
  'This chat runs on the API agent, which starts the work with exactly the arguments it proposed — so this run uses the agent’s own choices below.'

/** What the launch prompt shows about the work it is about to start. */
export type StartFeatureWorkGrantSummary = {
  storyId?: string
  /** The chat agent's own note for the run, when it wrote one. */
  note?: string
  /** Proof is on unless the agent explicitly asked for it off. */
  proofRequired: boolean
  /** Which agent the chat asked for; `undefined` means the same one as the chat. */
  runner?: StartFeatureWorkRunner
}

/**
 * Pull the human-facing bits out of a `startFeatureWork` grant's payload,
 * defensively — a malformed payload yields the defaults rather than throwing,
 * so the prompt still renders.
 *
 * The two transports hand over DIFFERENT shapes and both must be read: a CLI
 * broker action wraps them (`{ tool, args: {...} }`), while an API tool call's
 * `detail` IS the arguments object. Reading only the wrapper made every field
 * absent on an API chat, which left the dock waiting on a story id that never
 * came and its Start-work button permanently disabled.
 */
export function startFeatureWorkGrantSummary(
  grant: Pick<PendingToolGrant, 'detail'>,
): StartFeatureWorkGrantSummary {
  const payload = grant.detail
  const outer =
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
  const wrapped = outer.args
  const record =
    typeof wrapped === 'object' && wrapped !== null ? (wrapped as Record<string, unknown>) : outer
  const storyId = record.storyId
  const note = record.note
  const runner = record.runner
  return {
    ...(typeof storyId === 'string' && storyId.length > 0 ? { storyId } : {}),
    ...(typeof note === 'string' && note.length > 0 ? { note } : {}),
    proofRequired: record.proofRequired !== false,
    ...(runner === 'cli' || runner === 'api' ? { runner } : {}),
  }
}

/**
 * The features a launched run will pick up, in the order it will pick them.
 *
 * PAIRED with `findNextAvailableFeature` in thefactory-tools (`src/story/
 * storyUtils.ts`), which the developer run calls repeatedly: a feature is taken
 * when it is 'pending' and every blocker is done. Simulating that loop — each
 * pick counts as done for the next — gives the same list, in the same order,
 * that the run will actually work. The two must agree; change one and change
 * the other.
 */
export function featuresToWorkOn(story: Pick<Story, 'id' | 'features'>): Feature[] {
  const features = story.features ?? []
  const completed = new Set(
    features.filter((f) => f.status === 'done').map((f) => `${story.id}.${f.id}`),
  )
  const picked: Feature[] = []
  const taken = new Set<string>()
  for (;;) {
    const next = features.find(
      (f) =>
        !taken.has(f.id) &&
        f.status === 'pending' &&
        (f.blockers ?? []).every((b) => completed.has(b)),
    )
    if (!next) return picked
    picked.push(next)
    taken.add(next.id)
    completed.add(`${story.id}.${next.id}`)
  }
}

/** One beat of what happens after "yes" — a lead-in word and its sentence. */
export type LaunchBeat = {
  title: string
  detail: string
  /** True for the beat that says proof was turned OFF — drawn as a warning. */
  off?: boolean
}

/**
 * What approving actually does, in four beats. The proof beat is honest about
 * the switch: with proof off, the run may report done on its own word, and the
 * card must say so rather than promise verification it will not perform.
 */
export function launchBeats(proofRequired: boolean): LaunchBeat[] {
  return [
    {
      title: 'Launch',
      detail: 'a new agent run starts straight away, in its own chat that you can watch.',
    },
    {
      title: 'Isolated copy',
      detail:
        'it works in its own copy of the repo, on its own branch. Your files and the branch you are on are left alone.',
    },
    proofRequired
      ? {
          title: 'Proof',
          detail:
            'it has to show its work before it can report done. What counts depends on the change — a passing test, a clean build, a screen comparison.',
        }
      : {
          title: 'No proof',
          detail: 'you turned that off, so it can report done on its own word.',
          off: true,
        },
    {
      title: 'Your sign-off',
      detail:
        'it comes back to you with what it did and what it proved. Nothing merges without you.',
    },
  ]
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
