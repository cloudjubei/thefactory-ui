import type { ProcessRunWaitView } from './processRunWaitTypes'

/** Where a ticket's group story proposal stands. */
export type TicketStoryProposalOutcome =
  | 'asking'
  | 'creating'
  | 'created'
  | 'refused'
  | 'declined'
  | 'cancelled'

/** How a proposal's parts are drawn: a row each with the order in a line, or grouped under the step they run in. */
export type TicketStoryProposalLayout = 'rows' | 'steps'

/** The story a part is: one the project already has, or one the approval makes. */
export type TicketStoryPartStory =
  | { kind: 'new'; title?: string }
  | { kind: 'existing'; storyId: string; title?: string }

/** A feature a part's story is built from, as the proposal plans it. */
export interface TicketStoryFeatureView {
  title: string
  /** Markdown, as the agent wrote it. */
  description?: string
  /** What makes it done, one criterion each. */
  criteria: string[]
}

/** One part of a proposed group story: a project, its story, its features in build order, and what it waits for. */
export interface TicketStoryPartView {
  projectId: string
  projectTitle: string
  story: TicketStoryPartStory
  /** Which step it runs in, from 1. */
  step: number
  features: TicketStoryFeatureView[]
  /** The other work its run waits for before its proof, as a run's wait card shows it. */
  wait?: ProcessRunWaitView
}

/** How many of a part's features show, and how many fold behind "N more". */
export interface TicketStoryFeaturesFold {
  shown: number
  more: number
}

/** What a proposal's view is read from. */
export interface TicketStoryProposalInput {
  /** The call's arguments: `ticketKey`, `title`, `description`, `parts` (each with its `features` and `waitsFor`), `needs`. */
  args?: unknown
  result?: unknown
  resultType?: string
  /** The loaded projects, for their names. */
  projects?: readonly { id: string; title?: string | undefined }[] | undefined
  /** The chat's Jira site, to link the ticket with no read of it. */
  siteUrl?: string | undefined
}

/**
 * `proposeTicketGroupStory` as its ask and its tool row show it: the ticket,
 * the group story's title and description, a row per part, the order its parts
 * run in said plainly, and how it ended. Once made, the way to the group story.
 */
export interface TicketStoryProposalView {
  ticketKey?: string
  ticketUrl?: string
  title: string
  /** Markdown, as the agent wrote it. */
  description?: string
  parts: TicketStoryPartView[]
  /** The projects of each step, first step first. */
  steps: string[][]
  /** The order in a line, e.g. "Backend first, then Admin". */
  order?: string
  outcome: TicketStoryProposalOutcome
  note: string
  /** Why no story was made, in the words given. */
  error?: string
  /** Once made, that it is ready to run, in the backend's words. */
  ready?: string
  /** The group story that was made. */
  groupStory?: { groupId: string; groupStoryId: string; title: string }
}
