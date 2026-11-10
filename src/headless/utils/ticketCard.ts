import { ticketLink } from './groupTickets'
import { TICKET_CARD_TEXT } from './ticketCardConstants'
import type { TicketCardView, TicketPreview } from './ticketCardTypes'
import { ticketStatusLozenge } from './ticketStatus'

const filled = (value: string | undefined): string | undefined => {
  const text = value?.trim()
  return text ? text : undefined
}

/**
 * A ticket's preview as its card: issue type, title, key, status, priority and
 * who holds it, with the way to it in Jira when its link is a web page. Pure.
 */
export function ticketCardView(preview: TicketPreview): TicketCardView {
  const title = filled(preview.summary)
  const issueType = filled(preview.issueType)
  const status = ticketStatusLozenge(preview.status, preview.statusCategory)
  const priority = filled(preview.priority)
  const url = ticketLink(preview.url)
  return {
    key: preview.key,
    ...(title ? { title } : {}),
    ...(issueType ? { issueType } : {}),
    ...(status ? { status } : {}),
    facts: [
      ...(priority ? [{ label: TICKET_CARD_TEXT.priority, value: priority }] : []),
      {
        label: TICKET_CARD_TEXT.assignee,
        value: filled(preview.assignee) ?? TICKET_CARD_TEXT.unassigned,
      },
    ],
    ...(url ? { open: { label: TICKET_CARD_TEXT.open, url } } : {}),
  }
}
