import { describe, expect, it } from 'vitest'

import { ticketUpdateCard } from './ticketUpdate'
import { TICKET_UPDATE_COPY } from './ticketUpdateConstants'
import type { TicketUpdateData, TicketUpdateState } from './ticketUpdateTypes'

const CHANNEL = {
  kind: 'channel' as const,
  name: 'proj-team',
  permalink: 'https://acme.slack.com/archives/C1',
}
const POSTED = {
  channel: 'C1',
  ts: '1700000500.000100',
  permalink: 'https://acme.slack.com/archives/C1/p1700000500000100',
  postedAt: '2026-11-20T10:00:00.000Z',
}
const data = (over: Partial<TicketUpdateData> = {}): TicketUpdateData => ({
  offered: true,
  label: 'Slack Message',
  text: 'ABC-1 Export everywhere\nAPI PR: https://github.com/acme/api/pull/7',
  channel: CHANNEL,
  problems: [],
  ...over,
})
const state = (over: Partial<TicketUpdateState> = {}): TicketUpdateState => ({
  data: data(),
  readError: null,
  posting: false,
  error: null,
  ...over,
})

describe('ticketUpdateCard', () => {
  it('shows a post with nothing in its way, ready to post to its channel by name', () => {
    expect(ticketUpdateCard(state())).toEqual({
      phase: 'ready',
      title: TICKET_UPDATE_COPY.title,
      label: 'Slack Message',
      text: data().text,
      segments: [{ text: data().text, unfilled: false }],
      where: TICKET_UPDATE_COPY.to('#proj-team'),
      channelLink: { label: TICKET_UPDATE_COPY.openChannel, url: CHANNEL.permalink },
      problems: [],
      canPost: true,
      button: TICKET_UPDATE_COPY.post,
      confirm: {
        title: TICKET_UPDATE_COPY.confirmTitle('#proj-team'),
        body: TICKET_UPDATE_COPY.confirmBody,
        confirm: TICKET_UPDATE_COPY.confirm,
        cancel: TICKET_UPDATE_COPY.cancel,
      },
    })
  })

  it('shows nothing before the update is read, or while it is not offered', () => {
    expect(ticketUpdateCard(state({ data: undefined }))).toBeUndefined()
    expect(
      ticketUpdateCard(state({ data: data({ offered: false, problems: ['Waits.'] }) })),
    ).toBeUndefined()
  })

  it('marks a placeholder left in the post so it stands out', () => {
    const card = ticketUpdateCard(state({ data: data({ text: 'ABC-1 {{loom}}' }) }))
    expect(card?.segments).toEqual([
      { text: 'ABC-1 ', unfilled: false },
      { text: '{{loom}}', unfilled: true },
    ])
  })

  it('holds the post back with each reason while anything stands in its way', () => {
    const card = ticketUpdateCard(state({ data: data({ problems: ['One.', 'Two.'] }) }))
    expect(card).toMatchObject({ phase: 'blocked', canPost: false, problems: ['One.', 'Two.'] })
  })

  it('names a watched thread, and a channel Slack gave no name, by what they are', () => {
    const thread = ticketUpdateCard(
      state({
        data: data({ channel: { kind: 'thread', permalink: 'https://acme.slack.com/p1' } }),
      }),
    )
    expect(thread).toMatchObject({
      where: TICKET_UPDATE_COPY.to(TICKET_UPDATE_COPY.watchedThread),
      channelLink: { label: TICKET_UPDATE_COPY.openThread, url: 'https://acme.slack.com/p1' },
      confirm: { title: TICKET_UPDATE_COPY.confirmTitle(TICKET_UPDATE_COPY.watchedThread) },
    })
    const unnamed = ticketUpdateCard(
      state({ data: data({ channel: { kind: 'channel', permalink: CHANNEL.permalink } }) }),
    )
    expect(unnamed?.where).toBe(TICKET_UPDATE_COPY.to(TICKET_UPDATE_COPY.watchedChannel))
  })

  it('links nothing that is not a web link, and goes nowhere without a channel', () => {
    const odd = ticketUpdateCard(
      state({ data: data({ channel: { kind: 'channel', name: 'x', permalink: 'javascript:1' } }) }),
    )
    expect(odd?.channelLink).toBeUndefined()
    const oddPost = ticketUpdateCard(
      state({ data: data({ posted: { ...POSTED, permalink: 'javascript:alert(1)' } }) }),
    )
    expect(oddPost).toMatchObject({
      phase: 'posted',
      postedLine: TICKET_UPDATE_COPY.posted('#proj-team'),
    })
    expect(oddPost?.postedLink).toBeUndefined()
    const { channel: _none, ...bare } = data({ problems: ['No channel.'] })
    const nowhere = ticketUpdateCard(state({ data: bare }))
    expect(nowhere).toMatchObject({ where: TICKET_UPDATE_COPY.nowhere, phase: 'blocked' })
    expect(nowhere?.channelLink).toBeUndefined()
  })

  it('shows the post going at once on the press, and no second press', () => {
    expect(ticketUpdateCard(state({ posting: true }))).toMatchObject({
      phase: 'posting',
      canPost: false,
      button: TICKET_UPDATE_COPY.posting,
    })
  })

  it('shows where a posted update went, with its link', () => {
    const card = ticketUpdateCard(state({ data: data({ posted: POSTED }) }))
    expect(card).toMatchObject({
      phase: 'posted',
      canPost: false,
      postedLine: TICKET_UPDATE_COPY.posted('#proj-team'),
      postedLink: { label: TICKET_UPDATE_COPY.openPost, url: POSTED.permalink },
    })
  })

  it('says why the last post failed, ready to try again', () => {
    expect(ticketUpdateCard(state({ error: 'Slack said no.' }))).toMatchObject({
      phase: 'ready',
      canPost: true,
      error: 'Slack said no.',
    })
  })

  it('never says land in any of its words', () => {
    const words = JSON.stringify([
      ticketUpdateCard(state()),
      ticketUpdateCard(state({ data: data({ posted: POSTED }) })),
      TICKET_UPDATE_COPY,
    ])
    expect(words).not.toMatch(/\bland(ed|ing)?\b/i)
    expect(words).not.toMatch(/\bAI\b|Claude/)
  })
})
