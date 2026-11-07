/** One ticket a sign-off would write to, or why it would not. */
export type TicketPostTicket = {
  provider: string
  externalId: string
  title?: string
  url?: string
  posts: boolean
  why?: string
}

/** What approving a sign-off would post, as the backend says it. */
export type TicketPost = {
  tickets: TicketPostTicket[]
  /** The comment, word for word. Absent when no ticket gets one. */
  comment?: string
  /** The status the binding moves a ticket to, as it is saved. */
  transition?: string
  waiting?: string
}

/** What the sign-off shows of it. */
export type TicketPostView = {
  line: string
  notes: string[]
  comment?: string
}

/** How the comment is offered under the line. */
export type TicketPostLayout = 'fold' | 'quoted'
