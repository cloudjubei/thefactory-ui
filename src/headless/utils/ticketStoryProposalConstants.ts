import type {
  TicketStoryProposalLayout,
  TicketStoryProposalOutcome,
} from './ticketStoryProposalTypes'

/** The agent tool that proposes the group story a ticket becomes. */
export const TICKET_STORY_PROPOSAL_TOOL = 'proposeTicketGroupStory'

export const TICKET_STORY_PROPOSAL_OUTCOME: Readonly<Record<TicketStoryProposalOutcome, string>> = {
  asking: 'Waiting for your approval',
  creating: 'Creating…',
  created: 'Created',
  refused: 'Not created',
  declined: 'Not created — you declined',
  cancelled: 'Not created — cancelled',
}

export const TICKET_STORY_PROPOSAL_TEXT = {
  untitled: 'Untitled group story',
  parts: 'Parts',
  order: 'Order',
  anyOrder: 'In any order',
  newStory: 'New story',
  existingStory: 'Existing story',
  step: (n: number) => `Step ${n}`,
  groupStory: 'Group story',
  openGroupStory: (title: string) => `Open the group story “${title}”`,
  showMore: 'Show more',
  showLess: 'Show less',
} as const

export const TICKET_STORY_PROPOSAL_ASK = {
  ask: 'The agent proposes a group story for a ticket',
  tag: 'Tickets',
  headline: (ticketKey: string | undefined, title: string) =>
    ticketKey ? `${ticketKey}: ${title}` : title,
  consequence: 'Approving makes the group story and links it to the ticket.',
  verb: 'Create',
} as const

/** Characters of description shown before it folds behind "Show more". */
export const TICKET_STORY_DESCRIPTION_FOLD_CHARS = 320
/** Lines of description shown before it folds behind "Show more". */
export const TICKET_STORY_DESCRIPTION_FOLD_LINES = 5

export const TICKET_STORY_PROPOSAL_LAYOUTS: readonly TicketStoryProposalLayout[] = ['rows', 'steps']

export const TICKET_STORY_PROPOSAL_DEFAULT_LAYOUT: TicketStoryProposalLayout = 'rows'

export const TICKET_STORY_PROPOSAL_LAYOUT_LABELS: Readonly<
  Record<TicketStoryProposalLayout, string>
> = {
  rows: 'Rows',
  steps: 'Steps',
}
