import { describe, expect, it } from 'vitest'

import { ticketPostView } from './ticketPost'
import { TICKET_POST_TEXT } from './ticketPostConstants'
import type { TicketPost, TicketPostTicket } from './ticketPostTypes'

const ticket = (externalId: string, over: Partial<TicketPostTicket> = {}): TicketPostTicket => ({
  provider: 'jira',
  externalId,
  posts: true,
  ...over,
})
const refused = (externalId: string, why: string) => ticket(externalId, { posts: false, why })
const OFF = 'Connector write-back is off, so nothing is posted'
const COMMENT = 'Signed off: Fix the thing.\n\n- One feature'

describe('ticketPostView', () => {
  it.each([
    ['no answer yet', undefined],
    ['a run with no tickets', { tickets: [] }],
  ])('shows nothing for %s', (_name, post) => {
    expect(ticketPostView(post)).toBeUndefined()
  })

  it('says where the comment goes, and gives it word for word', () => {
    expect(ticketPostView({ tickets: [ticket('ENG-7')], comment: COMMENT })).toEqual({
      line: 'Posts a comment on ENG-7.',
      notes: [],
      comment: COMMENT,
    })
  })

  it('names the status a binding moves to', () => {
    const view = ticketPostView({
      tickets: [ticket('ENG-7')],
      comment: COMMENT,
      transition: 'Done',
    })
    expect(view?.line).toBe('Posts a comment on ENG-7, then moves to Done.')
  })

  it('lists two and three tickets in words', () => {
    const line = (ids: string[]) =>
      ticketPostView({ tickets: ids.map((id) => ticket(id)), comment: COMMENT })?.line
    expect(line(['A-1', 'A-2'])).toBe('Posts a comment on A-1 and A-2.')
    expect(line(['A-1', 'A-2', 'A-3'])).toBe('Posts a comment on A-1, A-2 and A-3.')
  })

  it('keeps a long list to a short line', () => {
    const tickets = ['A-1', 'A-2', 'A-3', 'A-4', 'A-5'].map((id) => ticket(id))
    expect(ticketPostView({ tickets, comment: COMMENT })?.line).toBe(
      'Posts a comment on A-1, A-2, A-3 and 2 more.',
    )
  })

  it('says write-back off as the line, with no comment and no transition', () => {
    const view = ticketPostView({ tickets: [refused('ENG-7', OFF), refused('ENG-8', OFF)] })
    expect(view).toEqual({ line: `ENG-7 and ENG-8: ${OFF}.`, notes: [] })
  })

  it('does not double a full stop the backend already wrote', () => {
    expect(ticketPostView({ tickets: [refused('ENG-7', 'Nope.')] })?.line).toBe('ENG-7: Nope.')
  })

  it('keeps each reason, with the tickets it holds back', () => {
    const view = ticketPostView({
      tickets: [refused('ENG-7', 'No access'), refused('ENG-8', 'Gone'), refused('ENG-9', 'Gone')],
    })
    expect(view).toEqual({
      line: 'ENG-7: No access.',
      notes: ['ENG-8 and ENG-9: Gone.'],
    })
  })

  it('shows what posts and, under it, what does not', () => {
    const view = ticketPostView({
      tickets: [ticket('ENG-7'), refused('ENG-8', 'No access')],
      comment: COMMENT,
    })
    expect(view).toEqual({
      line: 'Posts a comment on ENG-7.',
      notes: ['ENG-8: No access.'],
      comment: COMMENT,
    })
  })

  it('has a word for a ticket held back with no reason', () => {
    const view = ticketPostView({ tickets: [ticket('ENG-7', { posts: false })] })
    expect(view?.line).toBe(`ENG-7: ${TICKET_POST_TEXT.noReason}.`)
  })

  it('adds why the story’s tickets wait', () => {
    const post: TicketPost = {
      tickets: [ticket('ENG-7')],
      comment: COMMENT,
      waiting: 'The story’s own tickets wait for its last run.',
    }
    expect(ticketPostView(post)?.notes).toEqual(['The story’s own tickets wait for its last run.'])
  })

  it('gives the waiting words alone when nothing else is due', () => {
    expect(ticketPostView({ tickets: [], waiting: 'They wait.' })).toEqual({
      line: 'They wait.',
      notes: [],
    })
  })

  it('leaves a comment out when no ticket gets it', () => {
    const view = ticketPostView({ tickets: [refused('ENG-7', OFF)], comment: COMMENT })
    expect(view).not.toHaveProperty('comment')
  })
})
