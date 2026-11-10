import type { ChatContext, ExternalRef } from '../api'
import type { TicketStatusTone } from './ticketCardTypes'

/** A ticket of a group's Jira. Its text comes from Jira: it is shown as plain text. */
export interface GroupTicket {
  key: string
  summary: string
  url: string
  status?: string
  statusCategory?: string
  priority?: string
  issueType?: string
  assignee?: string
  /** The group story already working it. */
  groupStory?: { id: string; title: string }
  /** No group story and not started. Anything else can only be discussed. */
  canTake: boolean
  /** Its chat is already open. */
  chatOpen: boolean
}

/** The person's in the open sprint, everyone else's there, or a search. */
export type GroupTicketListName = 'mine' | 'sprint' | 'search'

/** What one read of a group's tickets asks for. The person's when no view is named. */
export interface GroupTicketsQuery {
  view?: GroupTicketListName
  /** With `search`: a ticket key, or words. */
  q?: string
  nextPageToken?: string
}

/** One page or more of tickets, in board order. */
export interface GroupTicketList {
  /** False when the group has no Jira. */
  connected: boolean
  access?: 'read' | 'read-write'
  tickets: GroupTicket[]
  /** The top ticket that can be taken: only on the person's list. */
  nextTicketKey?: string
  /** Pass back for the next page; absent on the last. */
  nextPageToken?: string
}

/** The agent a ticket's chat runs on; empty uses the one the person runs on. */
export interface TicketPlanBody {
  runner?: 'api' | 'cli'
  cliTool?: string
  cliModel?: string
  cliCredentialId?: string
  effort?: string
}

/** A ticket's chat, opened or found. */
export interface TicketPlanStarted {
  ticket: GroupTicket
  chatContextId: string
  context: ChatContext
  /** Whether its agent is now working. */
  turnStarted: boolean
  /** The ticket's chat was there already: nothing new was started. */
  alreadyOpen: boolean
}

/** One list as `GroupTicketsStore` keeps it. */
export interface GroupTicketSection {
  /** Undefined until the first read answers. */
  list: GroupTicketList | undefined
  /** Why the last read failed. */
  readError: string | null
  loadingMore: boolean
}

/** The search, with the words it was asked; none means there is no search. */
export interface GroupTicketSearch extends GroupTicketSection {
  query: string
}

/** What opens a ticket's chat: talking it over, or planning its group story. */
export type GroupTicketAction = 'discuss' | 'plan'

/** What the group's tickets stand at, as `GroupTicketsStore` keeps them. */
export interface GroupTicketsState {
  mine: GroupTicketSection
  sprint: GroupTicketSection
  search: GroupTicketSearch
  /** The ticket whose chat is being opened. */
  starting: { key: string; action: GroupTicketAction } | undefined
  /** Why the last chat did not open. */
  startError: string | null
}

/** How a ticket's chip is drawn: its key and status in one chip, or the status as a pill beside it. */
export type TicketChipLayout = 'joined' | 'split'

/** A ticket as a chip shows it. */
export interface TicketChipView {
  key: string
  status?: string
  /** The status's colour, from its Jira category; absent when none is known. */
  statusTone?: Exclude<TicketStatusTone, 'unknown'>
  /** Only an http or https link; absent, the chip opens nothing. */
  url?: string
  /** The chip's words: the key and the status. */
  label: string
  /** What a hover or a screen reader adds: the ticket's title and where it goes. */
  hint: string
}

/** One ticket of a list. A press opens its discussion. */
export interface GroupTicketRow {
  key: string
  summary: string
  priority?: string
  chip: TicketChipView
  /** The group story working it. */
  work?: { id: string; title: string }
  /** Its chat is already open. */
  chatOpen: boolean
  /** Take ticket is offered; a ticket without it is only discussed. */
  canTake: boolean
  /** What is opening its chat right now. */
  starting?: GroupTicketAction
  /** What pressing the row does. */
  hint: string
}

/** One list on the Tickets tab. */
export interface GroupTicketSectionView {
  rows: GroupTicketRow[]
  /** How the list stands, in a line. */
  line: string
  /** Said when it has nothing to show. */
  emptyLine?: string
  /** Its first read is still out. */
  loading: boolean
  readError?: string
  canLoadMore: boolean
  loadingMore: boolean
}

/** What the Tickets tab shows. */
export type GroupTicketsView =
  | { kind: 'loading' }
  | { kind: 'no-jira' }
  | {
      kind: 'tickets'
      /** The top ticket that can be taken: it leaves `mine.rows` to stand above them. */
      next?: GroupTicketRow
      mine: GroupTicketSectionView
      others: GroupTicketSectionView
      /** While a search is on, the lists give way to it. */
      search?: GroupTicketSectionView & { query: string }
      /** Why neither list could be read, said once. */
      readError?: string
      startError?: string
      /** A chat is opening: nothing else can open one. */
      starting: boolean
    }

/** How the Tickets tab lays out the person's tickets and the rest of the sprint. */
export type GroupTicketsLayout = 'sections' | 'segmented' | 'columns'

/** Which list the Segmented layout shows. */
export type GroupTicketsShown = 'mine' | 'others'

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
