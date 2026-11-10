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

/** One part of a proposed group story: a project and its story. */
export interface TicketStoryPartView {
  projectId: string
  projectTitle: string
  story: TicketStoryPartStory
  /** Which step it runs in, from 1. */
  step: number
}

/** What a proposal's view is read from. */
export interface TicketStoryProposalInput {
  /** The call's arguments: `ticketKey`, `title`, `description`, `parts`, `needs`. */
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
  /** The group story that was made. */
  groupStory?: { groupId: string; groupStoryId: string; title: string }
}
