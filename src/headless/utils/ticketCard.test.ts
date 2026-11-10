import { describe, expect, it } from 'vitest'
import { ticketCardView } from './ticketCard'
import { TICKET_CARD_TEXT } from './ticketCardConstants'

describe('ticketCardView', () => {
  const URL = 'https://acme.atlassian.net/browse/ZNR-780'

  it('reads a full preview: type, title, key, status, priority, assignee and the way to Jira', () => {
    expect(
      ticketCardView({
        key: 'ZNR-780',
        summary: 'Sign-in loops on expired sessions',
        url: URL,
        status: 'In Progress',
        statusCategory: 'indeterminate',
        issueType: 'Bug',
        priority: 'High',
        assignee: 'Ada Wong',
      }),
    ).toEqual({
      key: 'ZNR-780',
      title: 'Sign-in loops on expired sessions',
      issueType: 'Bug',
      status: { label: 'In Progress', tone: 'progress' },
      facts: [
        { label: TICKET_CARD_TEXT.priority, value: 'High' },
        { label: TICKET_CARD_TEXT.assignee, value: 'Ada Wong' },
      ],
      open: { label: TICKET_CARD_TEXT.open, url: URL },
    })
  })

  it('says a ticket nobody holds is unassigned, and leaves out what Jira did not say', () => {
    expect(ticketCardView({ key: 'ZNR-1', summary: 'Bare', url: URL })).toEqual({
      key: 'ZNR-1',
      title: 'Bare',
      facts: [{ label: TICKET_CARD_TEXT.assignee, value: TICKET_CARD_TEXT.unassigned }],
      open: { label: TICKET_CARD_TEXT.open, url: URL },
    })
  })

  it('offers no way out through a link that is not a web page', () => {
    const view = ticketCardView({ key: 'ZNR-1', summary: 'S', url: 'javascript:alert(1)' })
    expect(view.open).toBeUndefined()
  })

  it('has no title for an empty summary', () => {
    expect(ticketCardView({ key: 'ZNR-1', summary: ' ', url: URL }).title).toBeUndefined()
  })
})
