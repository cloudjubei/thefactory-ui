import type { ReviewCommitsView } from './reviewCommitsTypes'
import type { ChatContext, ExternalRef } from '../api'
import type {
  ReviewOffer,
  ReviewOfferRowView,
  TicketReviewOffer,
} from './colleagueReviewSourceTypes'
import type { ReviewStartPhase } from './colleagueReviewStartTypes'
import type { GroupTicketSprint } from './groupTicketPageTypes'
import type {
  GroupTicketReplies,
  GroupTicketRepliesView,
  GroupTicketTab,
  GroupTicketTabAction,
  GroupTicketTabItem,
} from './groupTicketTabTypes'
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
  /** Its review chat is already open. */
  reviewOpen: boolean
  /** The latest update the group's watched Slack thread brought for it, waiting for the person. */
  reviewOffer?: TicketReviewOffer
  /** The tab it falls in; none when it matches no tab. */
  tabId?: string
  /** It is the person's. */
  mine?: boolean
  sprint?: GroupTicketSprint
  /** Replies to the person's own update and comments on their pull requests, on their rows of a tab that shows them. */
  replies?: GroupTicketReplies
}

/** The person's in the open sprint, the tab on screen, or a search. */
export type GroupTicketListName = 'mine' | 'tab' | 'search'

/** What one read of a group's tickets asks for. The person's when neither a view nor a tab is named. */
export interface GroupTicketsQuery {
  view?: 'mine' | 'search'
  /** With `search`: a ticket key, or words. */
  q?: string
  /** A tab's tickets, the person's and everyone else's. */
  tab?: string
  nextPageToken?: string
}

/** One page or more of tickets, in board order. */
export interface GroupTicketList {
  /** False when the group has no Jira. */
  connected: boolean
  access?: 'read' | 'read-write'
  tickets: GroupTicket[]
  /** How many updates the watched Slack thread brought wait for the person, across the group. */
  reviewOfferCount: number
  /** The top ticket that can be taken: only on the person's list. */
  nextTicketKey?: string
  /** Pass back for the next page; absent on the last. */
  nextPageToken?: string
  /** How many tickets each tab holds, by tab id. */
  tabCounts?: Record<string, number>
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

/** The group's tabs as the store read them. */
export interface GroupTicketTabsRead {
  /** Undefined until the first read answers. */
  tabs: GroupTicketTab[] | undefined
  custom: boolean
  readError: string | null
}

/** What the group's tickets stand at, as `GroupTicketsStore` keeps them. */
export interface GroupTicketsState {
  mine: GroupTicketSection
  tabs: GroupTicketTabsRead
  /** The tab the person picked; the first when none. */
  tab: string | undefined
  /** Each tab's tickets once read, kept while another is on screen. */
  byTab: Readonly<Record<string, GroupTicketSection>>
  /** How many tickets each tab holds, as the latest read said. */
  tabCounts: Readonly<Record<string, number>>
  search: GroupTicketSearch
  /** The ticket whose chat is being opened. */
  starting: { key: string; action: GroupTicketAction } | undefined
  /** Why the last chat did not open. */
  startError: string | null
  /** The tickets whose review round is starting, each on its own. */
  reviewing: Readonly<Record<string, ReviewStartPhase>>
  /** The waiting updates read whole, by id: what the paste box fills from. */
  offers: Readonly<Record<string, ReviewOffer>>
  /** Why the person's last dismiss did not go through. */
  offerError: string | null
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

/** One ticket of a list. A press opens its page. */
export interface GroupTicketRow {
  key: string
  summary: string
  priority?: string
  chip: TicketChipView
  /** The group story working it. */
  work?: { id: string; title: string }
  /** Its chat is already open. */
  chatOpen: boolean
  /** It has a review: Review starts its next round. */
  reviewOpen: boolean
  /** What its Review button says while a round starts. */
  reviewing?: string
  /** An update from Slack waits on it: Review starts from it. */
  offer?: ReviewOfferRowView
  /** What its tab offers on it, in the order it shows them. */
  actions: GroupTicketTabAction[]
  /** Replies to the person's update and comments on their pull requests, when its tab shows them. */
  replies?: GroupTicketRepliesView
  /** What is opening its chat right now. */
  starting?: GroupTicketAction
  /** What pressing the row does. */
  hint: string
  /** On a ticket under review: the reply waiting on it and what was pushed since the last round. */
  reviewNews?: GroupTicketReviewNews
}

/** What came on a ticket under review since its last round, in a line on its row. */
export interface GroupTicketReviewNews {
  /** "Aashan replied · 1 hour ago", while a reply waits to start the next round. */
  reply?: string
  /** What its pull requests did since the round; "No new commits" only beside a reply. */
  commits?: ReviewCommitsView
  /** The whole line: the reply, then the commits. */
  line: string
}

/** Which part of a list a group of rows is. */
export type GroupTicketRowGroupId = 'all' | 'reviewing' | 'to-review'

/**
 * A part of a list, under its own heading when it has one: a list not split is
 * one group, `all`; everyone else's tickets, once some are under review, are
 * `reviewing` above `to-review`. An empty group is left out.
 */
export interface GroupTicketRowGroup {
  id: GroupTicketRowGroupId
  heading?: string
  rows: GroupTicketRow[]
}

/** One list on the Tickets tab. */
export interface GroupTicketSectionView {
  groups: GroupTicketRowGroup[]
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
  /** The tabs could not be read, so no tab can be. */
  | { kind: 'failed'; error: string }
  | {
      kind: 'tickets'
      /** The tab bar. */
      tabs: GroupTicketTabItem[]
      /** The tab on screen. */
      tab: string
      /** The top ticket that can be taken: it leaves `mine` to stand above its rows. */
      next?: GroupTicketRow
      mine: GroupTicketSectionView
      others: GroupTicketSectionView
      /** The tab holds no ticket at all, said once. */
      emptyLine?: string
      /** More of the tab's tickets can be read. */
      canLoadMore: boolean
      loadingMore: boolean
      /** While a search is on, the lists give way to it. */
      search?: GroupTicketSectionView & { query: string }
      /** Why the tab could not be read, said once. */
      readError?: string
      startError?: string
      /** A chat is opening: nothing else can open one. */
      starting: boolean
      /** How many updates from Slack wait for the person, across the group. */
      offerCount: number
      /** Why the person's last dismiss did not go through. */
      offerError?: string
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
