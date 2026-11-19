import type { ProcessRun, ReviewVerdict } from 'thefactory-tools/types'
import type { ChatContext } from '../api'
import type { ColleagueReviewOfferKind, ColleagueReviewOfferState } from '../api/generated'
import type { TicketChipView } from './groupTicketTypes'
import type { GroupTicketTabAction, GroupTicketToneLabel } from './groupTicketTabTypes'

/** A ticket's sprint: its name and whether it is open. */
export interface GroupTicketSprint {
  name: string
  open: boolean
}

/** A pull request a ticket's review lists. */
export interface GroupTicketPullRequest {
  url: string
  repo: string
  number: number
  title: string
  state: 'open' | 'merged' | 'closed'
  checks?: 'passing' | 'failing' | 'pending' | 'none'
}

/** One round of a ticket's review, in a line. */
export interface GroupTicketReviewRound {
  n: number
  verdict?: ReviewVerdict
  startedAt: string
  recordedAt?: string
  postedReply?: { permalink: string; postedAt: string }
  mergedMessage?: string
}

/** A run a round was reviewed in. */
export interface GroupTicketReviewRun {
  id: string
  status: ProcessRun['status']
  round: number
  projectId: string
}

/** One update the watched Slack thread brought for a ticket, whatever became of it. */
export interface GroupTicketUpdate {
  id: string
  kind: ColleagueReviewOfferKind
  author: string
  postedAt: string
  permalink: string
  state: ColleagueReviewOfferState
  /** How many files came with it. */
  files: number
  text: string
  fileNames: string[]
}

/** The group story linked to a ticket, with its parts. */
export interface GroupTicketGroupStory {
  id: string
  title: string
  parts: { projectId: string; storyId: string; title?: string; status?: string }[]
}

/** A part of a ticket's overview that can fail on its own. */
export type GroupTicketOverviewPart =
  | 'ticket'
  | 'tab'
  | 'updates'
  | 'review'
  | 'pullRequests'
  | 'story'
  | 'chats'

/** Everything about one ticket, as its page reads it. A part that failed is absent and named in `problems`. */
export interface GroupTicketOverview {
  ticket?: {
    key: string
    url: string
    summary: string
    status: string
    statusCategory: string
    priority?: string
    assignee?: string
    sprint?: GroupTicketSprint
    description: string
    updatedAt?: string
    /** It is the person's. */
    mine: boolean
  }
  /** The tab it falls in; none when it matches no tab. */
  tabId?: string
  /** The tab's actions for the person on it. */
  actions: GroupTicketTabAction[]
  /** Every update the watched Slack thread brought for it, newest first. */
  updates: GroupTicketUpdate[]
  review?: {
    rounds: GroupTicketReviewRound[]
    openFindings: number
    runs: GroupTicketReviewRun[]
  }
  pullRequests: GroupTicketPullRequest[]
  story?: GroupTicketGroupStory
  chats: { context: ChatContext; chatContextId: string; title: string; updatedAt: string }[]
  problems?: GroupTicketOverviewPart[]
}

/** One fact about the ticket, as a label and its value. */
export interface GroupTicketFact {
  label: string
  value: string
}

/** One update from Slack on the page. */
export interface GroupTicketUpdateView {
  id: string
  /** "Update from Ana". */
  label: string
  when: string
  state: GroupTicketToneLabel
  files: string[]
  /** The web links in its text. */
  links: string[]
  /** Only an https link; absent, nothing opens. */
  permalink?: string
}

/** One round of the review on the page. */
export interface GroupTicketRoundView {
  n: number
  label: string
  verdict?: GroupTicketToneLabel
  /** "Started 2 hours ago" or "Recorded 1 hour ago". */
  when: string
  reply?: { label: string; permalink?: string }
  merged?: string
}

/** A review run on the page. */
export interface GroupTicketRunView {
  id: string
  projectId: string
  label: string
  status: GroupTicketToneLabel
}

/** A pull request on the page. */
export interface GroupTicketPullRequestView {
  url: string
  /** "coach-be #418". */
  name: string
  title: string
  state: GroupTicketToneLabel
  checks?: GroupTicketToneLabel
}

/** A chat about the ticket on the page. */
export interface GroupTicketChatView {
  context: ChatContext
  title: string
  when: string
}

/** What a ticket's page shows. */
export interface GroupTicketPageView {
  key: string
  summary: string
  chip: TicketChipView
  /** Only an http or https link. */
  url?: string
  facts: GroupTicketFact[]
  /** Absent while the ticket itself could not be read. */
  description?: string
  /** The tab it falls in, by name. */
  tabName?: string
  actions: GroupTicketTabAction[]
  updates: GroupTicketUpdateView[]
  review?: {
    rounds: GroupTicketRoundView[]
    findings: string
    runs: GroupTicketRunView[]
  }
  pullRequests: GroupTicketPullRequestView[]
  story?: GroupTicketGroupStory
  chats: GroupTicketChatView[]
  /** The parts that could not be read, each in a quiet line. */
  problems: string[]
  /** What a part read and found empty says; a part that failed says nothing here. */
  emptyLines: Partial<Record<'updates' | 'review' | 'pullRequests' | 'story' | 'chats', string>>
}

/** How the ticket page lays out its parts. */
export type GroupTicketPageLayout = 'sections' | 'columns' | 'tabs'

/** How the Tickets tab lays out its tabs. */
export type GroupTicketTabsLayout = 'bar' | 'side' | 'menu'

/** Where a ticket's page stands, as views draw it. */
export type GroupTicketPageState =
  | { kind: 'loading' }
  | { kind: 'failed'; error: string }
  | { kind: 'page'; page: GroupTicketPageView; refreshing: boolean }
