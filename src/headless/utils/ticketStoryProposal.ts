import { processWaitsForOf } from 'thefactory-tools/utils'
import { cleanCliToolName } from './cliRunner'
import { processPlannedWaitView } from './processRunWait'
import { runProposalCriteria } from './runProposalView'
import { ticketUrlOnSite } from './ticketLinks'
import {
  TICKET_STORY_FEATURES_SHOWN,
  TICKET_STORY_PROPOSAL_OUTCOME,
  TICKET_STORY_PROPOSAL_TEXT,
  TICKET_STORY_PROPOSAL_TOOL,
} from './ticketStoryProposalConstants'
import type {
  TicketStoryFeatureView,
  TicketStoryFeaturesFold,
  TicketStoryPartStory,
  TicketStoryPartView,
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
 * The steps a group story's parts run in, first step first, by the parts'
 * keys: a part runs after the part of its project before it and once every
 * part it needs has. `needs` names parts by their names — a story id, or a new
 * part's title. A need for no part, or for itself, is no need. Parts that need
 * each other in a circle go together, last. Pure.
 */
export function partsOrderSteps(
  parts: readonly { key: string; projectId: string; name: string }[],
  needs: unknown,
): string[][] {
  const wanted = record(needs)
  const keyOf = (name: string) => parts.find((p) => p.name === name)?.key
  const needsOf = (part: (typeof parts)[number], at: number): string[] => {
    const raw = wanted[part.name]
    const named = (Array.isArray(raw) ? raw : []).flatMap((n) => {
      const key = typeof n === 'string' ? keyOf(n) : undefined
      return key && key !== part.key ? [key] : []
    })
    const before = parts
      .slice(0, at)
      .filter((p) => p.projectId === part.projectId)
      .at(-1)
    return before ? [before.key, ...named] : named
  }
  const needed = new Map(parts.map((p, at) => [p.key, needsOf(p, at)]))
  const steps: string[][] = []
  const placed = new Set<string>()
  let left = [...new Set(parts.map((p) => p.key))]
  while (left.length > 0) {
    const ready = left.filter((key) => (needed.get(key) ?? []).every((n) => placed.has(n)))
    const step = ready.length > 0 ? ready : left
    steps.push(step)
    for (const key of step) placed.add(key)
    left = left.filter((key) => !placed.has(key))
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
  nameOf: (key: string) => string,
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

type PartPlan = Pick<TicketStoryPartView, 'features' | 'wait'>

function plannedFeatures(raw: unknown): TicketStoryFeatureView[] {
  const list = Array.isArray(raw) ? raw : []
  return list.flatMap((entry) => {
    const feature = record(entry)
    const title = text(feature.title)
    if (!title) return []
    const description = text(feature.description)
    const acceptance = text(feature.acceptance)
    return [
      {
        title,
        ...(description ? { description } : {}),
        criteria: acceptance ? runProposalCriteria(acceptance) : [],
      },
    ]
  })
}

function partPlans(raw: unknown): Map<string, PartPlan> {
  const plans = new Map<string, PartPlan>()
  for (const entry of Array.isArray(raw) ? raw : []) {
    const part = record(entry)
    const projectId = text(part.projectId)
    if (!projectId || plans.has(projectId)) continue
    const read = processWaitsForOf(part.waitsFor)
    const wait = 'waitsFor' in read ? processPlannedWaitView(read.waitsFor) : undefined
    plans.set(projectId, { features: plannedFeatures(part.features), ...(wait ? { wait } : {}) })
  }
  return plans
}

function firstSentence(value: unknown): string | undefined {
  const message = text(value)
  return message?.match(/^.*?[.!?](?=\s|$)/s)?.[0] ?? message
}

/**
 * How many of a part's features show and how many fold behind "N more": the
 * first few of a long list, all of it once opened, and never one alone folded. Pure.
 */
export function ticketStoryFeaturesFold(count: number, open: boolean): TicketStoryFeaturesFold {
  if (open || count <= TICKET_STORY_FEATURES_SHOWN + 1) return { shown: count, more: 0 }
  return { shown: TICKET_STORY_FEATURES_SHOWN, more: count - TICKET_STORY_FEATURES_SHOWN }
}

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
 * was made, the part stories by their titles, that it is ready to run and the
 * way to the group story. Each part keeps the features and the wait the agent
 * planned for its project, before and after. A refusal shows why and offers no
 * way to a story. Pure.
 */
export function ticketStoryProposalView(input: TicketStoryProposalInput): TicketStoryProposalView {
  const args = record(input.args)
  const answer = record(input.result)
  const refusal = text(answer.error)
  const outcome = outcomeOf(input.resultType, refusal !== undefined)
  const created = outcome === 'created'
  const made = created ? madeParts(answer.parts) : []
  const raw = made.length > 0 ? made : askedParts(args.parts)
  const askedTitle = text(args.title) ?? ''
  const keyed = raw.map((p, at) => ({
    key: `part-${at}`,
    projectId: p.projectId,
    name: p.story.kind === 'existing' ? p.story.storyId : (p.story.title ?? askedTitle),
  }))
  const needs =
    made.length > 0
      ? Object.fromEntries(
          made.map((p) => [p.story.kind === 'existing' ? p.story.storyId : '', p.needs]),
        )
      : args.needs
  const steps = partsOrderSteps(keyed, needs)
  const projectOfKey = (key: string) => keyed.find((k) => k.key === key)?.projectId ?? key
  const nameOf = (projectId: string) =>
    text(input.projects?.find((p) => p.id === projectId)?.title) ?? projectId
  const ticketKey = text(args.ticketKey)
  const ticketUrl = ticketKey ? ticketUrlOnSite(input.siteUrl, ticketKey) : undefined
  const title =
    (created ? text(answer.title) : undefined) ??
    text(args.title) ??
    TICKET_STORY_PROPOSAL_TEXT.untitled
  const description = (created ? text(answer.description) : undefined) ?? text(args.description)
  const order = partsOrderLine(steps, (key) => nameOf(projectOfKey(key)))
  const groupId = text(answer.groupId)
  const groupStoryId = text(answer.groupStoryId)
  const plans = partPlans(args.parts)
  const ready = created ? firstSentence(answer.message) : undefined
  const failed = outcome === 'refused' || outcome === 'declined' || outcome === 'cancelled'
  const error = failed
    ? (refusal ?? toolRowReason(outcome === 'declined' ? 'not_allowed' : 'errored', input.result))
    : undefined
  return {
    ...(ticketKey ? { ticketKey } : {}),
    ...(ticketUrl ? { ticketUrl } : {}),
    title,
    ...(description ? { description } : {}),
    parts: raw.map(({ projectId, story }, at) => ({
      key: `part-${at}`,
      projectId,
      projectTitle: nameOf(projectId),
      story,
      step: steps.findIndex((step) => step.includes(`part-${at}`)) + 1,
      ...(plans.get(projectId) ?? { features: [] }),
    })),
    steps,
    ...(order ? { order } : {}),
    outcome,
    note: TICKET_STORY_PROPOSAL_OUTCOME[outcome],
    ...(error ? { error } : {}),
    ...(ready ? { ready } : {}),
    ...(created && groupId && groupStoryId ? { groupStory: { groupId, groupStoryId, title } } : {}),
  }
}
