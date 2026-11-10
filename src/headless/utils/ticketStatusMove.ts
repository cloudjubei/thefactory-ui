import { cleanCliToolName } from './cliRunner'
import { ticketLink } from './groupTickets'
import { ticketStatusLozenge } from './ticketStatus'
import type { TicketStatusLozengeView } from './ticketCardTypes'
import { ticketUrlOnSite } from './ticketLinks'
import {
  TICKET_STATUS_MOVE_OUTCOME,
  TICKET_STATUS_MOVE_TEXT,
  TICKET_STATUS_MOVE_TOOL,
} from './ticketStatusMoveConstants'
import type {
  TicketStatusMoveInput,
  TicketStatusMoveOutcome,
  TicketStatusMoveView,
} from './ticketStatusMoveTypes'
import { toolRowReason } from './toolPreview'

type Rec = Record<string, unknown>

const record = (v: unknown): Rec =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {}

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

/** Whether a tool call moves a Jira ticket's status, under its bare name or a CLI's prefixed one. Pure. */
export function isTicketStatusMoveTool(name: string | undefined): boolean {
  return name !== undefined && cleanCliToolName(name) === TICKET_STATUS_MOVE_TOOL
}

function outcomeOf(resultType: string | undefined, refused: boolean): TicketStatusMoveOutcome {
  if (refused || resultType === 'errored') return 'failed'
  if (resultType === 'not_allowed') return 'declined'
  if (resultType === 'aborted') return 'cancelled'
  if (resultType === 'running') return 'moving'
  return resultType === 'success' ? 'moved' : 'asking'
}

function statusOf(raw: unknown): TicketStatusLozengeView | undefined {
  const { status, statusCategory } = record(raw)
  return ticketStatusLozenge(text(status), text(statusCategory))
}

function targetOf(transition: string | undefined): TicketStatusLozengeView | undefined {
  if (!transition) return undefined
  const label = /^\d+$/.test(transition)
    ? TICKET_STATUS_MOVE_TEXT.transitionId(transition)
    : transition
  return { label, tone: 'unknown' }
}

/**
 * A `transitionJiraIssue` call as its row and its ask show it. A finished move
 * reads Jira's answer: the ticket and the statuses it moved between. An older
 * row with no such answer keeps its key and the target the agent asked for. An
 * ask shows the target, and where the ticket stands now once its preview is
 * read. A failed, refused or cancelled move shows why and no statuses. Pure.
 */
export function ticketStatusMoveView(input: TicketStatusMoveInput): TicketStatusMoveView {
  const args = record(input.args)
  const answer = record(input.result)
  const refusal = text(answer.error)
  const outcome = outcomeOf(input.resultType, refusal !== undefined)
  const moved = outcome === 'moved'
  const open = moved || outcome === 'asking' || outcome === 'moving'
  const key =
    (moved ? text(answer.key) : undefined) ??
    text(args.issueKey) ??
    TICKET_STATUS_MOVE_TEXT.unknownTicket
  const url =
    (moved ? ticketLink(text(answer.url)) : undefined) ??
    ticketLink(input.preview?.url) ??
    ticketUrlOnSite(input.siteUrl, key)
  const title = (moved ? text(answer.summary) : undefined) ?? text(input.preview?.summary)
  const from = moved
    ? statusOf(answer.from)
    : ticketStatusLozenge(input.preview?.status, input.preview?.statusCategory)
  const to = (moved ? statusOf(answer.to) : undefined) ?? targetOf(text(args.transition))
  const comment = text(args.comment)
  const error = open
    ? undefined
    : (refusal ?? toolRowReason(outcome === 'declined' ? 'not_allowed' : 'errored', input.result))
  return {
    key,
    ...(url ? { url } : {}),
    ...(title ? { title } : {}),
    ...(open && from ? { from } : {}),
    ...(open && to ? { to } : {}),
    ...(open && to
      ? { line: [from?.label, TICKET_STATUS_MOVE_TEXT.arrow, to.label].filter(Boolean).join(' ') }
      : {}),
    ...(open && comment ? { comment } : {}),
    outcome,
    note: TICKET_STATUS_MOVE_OUTCOME[outcome],
    ...(error ? { error } : {}),
  }
}
