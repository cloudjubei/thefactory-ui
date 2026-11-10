import { cleanCliToolName } from './cliRunner'
import { ticketUrlOnSite } from './ticketLinks'
import {
  TICKET_STORY_PROPOSAL_OUTCOME,
  TICKET_STORY_PROPOSAL_TEXT,
  TICKET_STORY_PROPOSAL_TOOL,
} from './ticketStoryProposalConstants'
import type {
  TicketStoryPartStory,
  TicketStoryProposalInput,
  TicketStoryProposalOutcome,
  TicketStoryProposalView,
} from './ticketStoryProposalTypes'
import { toolRowReason } from './toolPreview'

type Rec = Record<string, unknown>

const record = (v: unknown): Rec =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

/** Whether a tool call proposes a ticket's group story, under its bare name or a CLI's prefixed one. Pure. */
export function isTicketStoryProposalTool(name: string | undefined): boolean {
  return name !== undefined && cleanCliToolName(name) === TICKET_STORY_PROPOSAL_TOOL
}

/**
 * The steps a group story's parts run in, first step first: a part runs once
 * every part it needs has. A need for a project that is no part, or for itself,
 * is no need. Parts that need each other in a circle go together, last. Pure.
 */
export function partsOrderSteps(projectIds: readonly string[], needs: unknown): string[][] {
  const wanted = record(needs)
  const needsOf = (id: string): string[] => {
    const raw = wanted[id]
    const list = Array.isArray(raw) ? raw : []
    return list.filter((n): n is string => n !== id && projectIds.includes(n as string))
  }
  const steps: string[][] = []
  const placed = new Set<string>()
  let left = [...new Set(projectIds)]
  while (left.length > 0) {
    const ready = left.filter((id) => needsOf(id).every((need) => placed.has(need)))
    const step = ready.length > 0 ? ready : left
    steps.push(step)
    for (const id of step) placed.add(id)
    left = left.filter((id) => !placed.has(id))
  }
  return steps
}

function listed(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The order of a group story's parts in a line: "Backend first, then Admin".
 * Parts with no order between them go in any order; one part has no order to
 * say. Pure.
 */
export function partsOrderLine(
  steps: readonly (readonly string[])[],
  nameOf: (projectId: string) => string,
): string | undefined {
  const [first, ...rest] = steps
  if (!first) return undefined
  if (rest.length === 0) return first.length > 1 ? TICKET_STORY_PROPOSAL_TEXT.anyOrder : undefined
  return [
    `${listed(first.map(nameOf))} first`,
    ...rest.map((step) => `then ${listed(step.map(nameOf))}`),
  ].join(', ')
}

function outcomeOf(resultType: string | undefined, refused: boolean): TicketStoryProposalOutcome {
  if (refused || resultType === 'errored') return 'refused'
  if (resultType === 'not_allowed') return 'declined'
  if (resultType === 'aborted') return 'cancelled'
  if (resultType === 'running') return 'creating'
  return resultType === 'success' ? 'created' : 'asking'
}

type RawPart = { projectId: string; story: TicketStoryPartStory; needs?: unknown }

function askedParts(raw: unknown): RawPart[] {
  const list = Array.isArray(raw) ? raw : []
  return list.flatMap((entry) => {
    const part = record(entry)
    const projectId = text(part.projectId)
    if (!projectId) return []
    const storyId = text(part.storyId)
    const title = text(part.newStoryTitle)
    const story: TicketStoryPartStory = storyId
      ? { kind: 'existing', storyId }
      : { kind: 'new', ...(title ? { title } : {}) }
    return [{ projectId, story }]
  })
}

function madeParts(raw: unknown): RawPart[] {
  const list = Array.isArray(raw) ? raw : []
  return list.flatMap((entry) => {
    const part = record(entry)
    const projectId = text(part.projectId)
    const storyId = text(part.storyId)
    if (!projectId || !storyId) return []
    const title = text(part.storyTitle)
    return [
      {
        projectId,
        story: { kind: 'existing' as const, storyId, ...(title ? { title } : {}) },
        needs: part.needs,
      },
    ]
  })
}

/**
 * A `proposeTicketGroupStory` call as its ask and its row show it. Before
 * approval it reads the agent's arguments; once the story is made it reads what
 * was made, the part stories by their titles and the way to the group story. A
 * refusal shows why and offers no way to a story. Pure.
 */
export function ticketStoryProposalView(input: TicketStoryProposalInput): TicketStoryProposalView {
  const args = record(input.args)
  const answer = record(input.result)
  const refusal = text(answer.error)
  const outcome = outcomeOf(input.resultType, refusal !== undefined)
  const created = outcome === 'created'
  const made = created ? madeParts(answer.parts) : []
  const raw = made.length > 0 ? made : askedParts(args.parts)
  const needs =
    made.length > 0 ? Object.fromEntries(made.map((p) => [p.projectId, p.needs])) : args.needs
  const steps = partsOrderSteps(
    raw.map((p) => p.projectId),
    needs,
  )
  const nameOf = (projectId: string) =>
    text(input.projects?.find((p) => p.id === projectId)?.title) ?? projectId
  const ticketKey = text(args.ticketKey)
  const ticketUrl = ticketKey ? ticketUrlOnSite(input.siteUrl, ticketKey) : undefined
  const title =
    (created ? text(answer.title) : undefined) ??
    text(args.title) ??
    TICKET_STORY_PROPOSAL_TEXT.untitled
  const description = (created ? text(answer.description) : undefined) ?? text(args.description)
  const order = partsOrderLine(steps, nameOf)
  const groupId = text(answer.groupId)
  const groupStoryId = text(answer.groupStoryId)
  const failed = outcome === 'refused' || outcome === 'declined' || outcome === 'cancelled'
  const error = failed
    ? (refusal ?? toolRowReason(outcome === 'declined' ? 'not_allowed' : 'errored', input.result))
    : undefined
  return {
    ...(ticketKey ? { ticketKey } : {}),
    ...(ticketUrl ? { ticketUrl } : {}),
    title,
    ...(description ? { description } : {}),
    parts: raw.map(({ projectId, story }) => ({
      projectId,
      projectTitle: nameOf(projectId),
      story,
      step: steps.findIndex((step) => step.includes(projectId)) + 1,
    })),
    steps,
    ...(order ? { order } : {}),
    outcome,
    note: TICKET_STORY_PROPOSAL_OUTCOME[outcome],
    ...(error ? { error } : {}),
    ...(created && groupId && groupStoryId ? { groupStory: { groupId, groupStoryId, title } } : {}),
  }
}
