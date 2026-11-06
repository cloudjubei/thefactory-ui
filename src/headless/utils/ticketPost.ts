import { TICKET_POST_NAMED_MAX, TICKET_POST_TEXT } from './ticketPostConstants'
import type { TicketPost, TicketPostTicket, TicketPostView } from './ticketPostTypes'

function ticketNames(tickets: readonly TicketPostTicket[]): string {
  const ids = tickets.map((ticket) => ticket.externalId)
  if (ids.length > TICKET_POST_NAMED_MAX) {
    const named = ids.slice(0, TICKET_POST_NAMED_MAX).join(', ')
    return `${named} and ${ids.length - TICKET_POST_NAMED_MAX} more`
  }
  return ids.length > 1 ? `${ids.slice(0, -1).join(', ')} and ${ids.at(-1)}` : (ids[0] ?? '')
}

/** One line per reason, naming the tickets it holds back. */
function heldLines(tickets: readonly TicketPostTicket[]): string[] {
  const byReason = new Map<string, TicketPostTicket[]>()
  for (const ticket of tickets) {
    const why = ticket.why ?? TICKET_POST_TEXT.noReason
    byReason.set(why, [...(byReason.get(why) ?? []), ticket])
  }
  return [...byReason].map(([why, held]) => TICKET_POST_TEXT.held(ticketNames(held), why))
}

/** What a sign-off shows of what approving would post. Nothing at all when no ticket is involved. */
export function ticketPostView(post: TicketPost | undefined): TicketPostView | undefined {
  if (!post) return undefined
  const posting = post.tickets.filter((ticket) => ticket.posts)
  const [line, ...notes] = [
    ...(posting.length ? [TICKET_POST_TEXT.posts(ticketNames(posting), post.transition)] : []),
    ...heldLines(post.tickets.filter((ticket) => !ticket.posts)),
    ...(post.waiting ? [post.waiting] : []),
  ]
  if (!line) return undefined
  return { line, notes, ...(posting.length && post.comment ? { comment: post.comment } : {}) }
}
