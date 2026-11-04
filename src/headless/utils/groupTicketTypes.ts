import type { ChatContext, ExternalRef } from '../api'

/** A ticket on the person's sprint list. Its text comes from Jira: it is shown as plain text. */
export interface GroupTicket {
  key: string
  summary: string
  url: string
  status?: string
  priority?: string
  issueType?: string
  /** The group story already working it. */
  groupStory?: { id: string; title: string }
}

/** The person's tickets in the open sprint, in board order. */
export interface GroupTicketList {
  /** False when the group has no Jira. */
  connected: boolean
  access?: 'read' | 'read-write'
  tickets: GroupTicket[]
  /** The top ticket with no group story yet. */
  nextTicketKey?: string
  /** Pass back for the next page; absent on the last. */
  nextPageToken?: string
}

/** The agent a plan runs on; empty uses the one the person runs on. */
export interface TicketPlanBody {
  runner?: 'api' | 'cli'
  cliTool?: string
  cliModel?: string
  cliCredentialId?: string
  effort?: string
}

/** A ticket's planning chat, opened or found. */
export interface TicketPlanStarted {
  ticket: GroupTicket
  chatContextId: string
  context: ChatContext
  /** Whether its agent is now working. */
  turnStarted: boolean
  /** The ticket's chat was there already: nothing new was started. */
  alreadyOpen: boolean
}

/** What the group's tickets stand at, as `GroupTicketsStore` keeps them. */
export interface GroupTicketsState {
  /** Undefined until the first read answers. */
  list: GroupTicketList | undefined
  /** Why the last read failed. */
  readError: string | null
  loadingMore: boolean
  /** The ticket whose plan is being started. */
  planning: string | undefined
  /** Why the last plan did not start. */
  planError: string | null
}

/** How a ticket's chip is drawn: its key and status in one chip, or the status as a pill beside it. */
export type TicketChipLayout = 'joined' | 'split'

/** A ticket as a chip shows it. */
export interface TicketChipView {
  key: string
  status?: string
  /** Only an http or https link; absent, the chip opens nothing. */
  url?: string
  /** The chip's words: the key and the status. */
  label: string
  /** What a hover or a screen reader adds: the ticket's title and where it goes. */
  hint: string
}

/** One ticket of the sprint list. */
export interface GroupTicketRow {
  key: string
  summary: string
  priority?: string
  chip: TicketChipView
  /** The group story working it: the row opens it. Absent, the row starts its plan. */
  work?: { id: string; title: string }
  /** Its plan is being started. */
  planning: boolean
  /** What pressing the row does. */
  hint: string
}

/** What the Take next ticket section shows. */
export interface TakeNextTicketView {
  /** The top ticket with no work yet. */
  next?: GroupTicketRow
  /** Every ticket, in board order. */
  rows: GroupTicketRow[]
  /** How the sprint stands, in a line. */
  sprintLine: string
  /** Said when there is no next ticket. */
  noNextLine?: string
  readError?: string
  planError?: string
  canLoadMore: boolean
  loadingMore: boolean
  /** A plan is being started: nothing else can start one. */
  planning: boolean
}

/** How Take next ticket is laid out on the Stories tab. */
export type TakeNextTicketLayout = 'card' | 'list' | 'columns'

/** What a launch says of a group story's ticket. */
export interface TicketLaunchMove {
  ticketKey: string
  ticketTitle?: string
  ticketUrl?: string
  ticketStatus?: string
  /** The move as the card shows it; absent when there is none. */
  change?: string
  /** What a launch sends back to approve the move. */
  transitionId?: string
  toStatus?: string
  /** Why no move is offered. */
  unavailable?: string
}

/** The person's approval of the one move the launch offered. */
export interface TicketMoveDecision {
  ticketKey: string
  transitionId: string
}

/** What came of an approved move. It never stops the run. */
export interface TicketMoveOutcome {
  ticketKey: string
  moved: boolean
  toStatus?: string
  /** What to show the person. */
  message: string
}

/** What a launch card draws of a ticket: a move to tick, or why there is none. */
export type TicketMoveFieldView =
  | {
      kind: 'offer'
      chip: TicketChipView
      title?: string
      change: string
      decision: TicketMoveDecision
    }
  | { kind: 'unavailable'; chip: TicketChipView; title?: string; text: string }

/** Where a launch card puts the ticket: first on the card, or with the agent's settings. */
export type TicketMoveLayout = 'top' | 'settings'

/** A group run that started, as the Run dialog says it. */
export interface GroupRunStartedWords {
  message: string
  /** Why the ticket did not move. */
  notMoved?: string
}

/** The Jira ticket a group story is linked to, as the view gives it. */
export type GroupStoryTicketRef = ExternalRef
