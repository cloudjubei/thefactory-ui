import { describe, expect, it } from 'vitest'
import type { ReviewOffer } from './colleagueReviewSourceTypes'
import {
  reviewReplyBoxOffer,
  reviewReplyLine,
  reviewReplySources,
  reviewReplyView,
  waitingReviewReply,
} from './reviewReply'
import type { ReviewReplySource } from './reviewReplyTypes'

const NOW = Date.parse('2026-11-19T12:00:00.000Z')

const reply = (over: Partial<ReviewReplySource> = {}): ReviewReplySource => ({
  id: 'o2',
  kind: 'next-round',
  state: 'new',
  author: 'Aashan',
  postedAt: '2026-11-19T11:00:00.000Z',
  text: 'Pushed the fix for the empty state.',
  files: 0,
  ...over,
})

describe('waitingReviewReply', () => {
  it('is the newest reply still waiting to start the next round', () => {
    const updates = [
      reply({ id: 'older', postedAt: '2026-11-19T09:00:00.000Z' }),
      reply({ id: 'newer', postedAt: '2026-11-19T11:30:00.000Z' }),
      reply({ id: 'first', kind: 'first-round', postedAt: '2026-11-19T11:50:00.000Z' }),
      reply({ id: 'started', state: 'started', postedAt: '2026-11-19T11:55:00.000Z' }),
      reply({ id: 'dismissed', state: 'dismissed', postedAt: '2026-11-19T11:56:00.000Z' }),
    ]
    expect(waitingReviewReply(updates)?.id).toBe('newer')
    expect(waitingReviewReply([reply({ state: 'started' })])).toBeUndefined()
  })
})

describe('reviewReplyLine', () => {
  it('names who replied and when, then what was pushed when known', () => {
    expect(reviewReplyLine('Aashan replied', '1h ago', undefined)).toBe('Aashan replied · 1h ago')
    expect(
      reviewReplyLine('Aashan replied', '1h ago', { label: '3 new commits', tone: 'news' }),
    ).toBe('Aashan replied · 1h ago · 3 new commits')
  })
})

describe('reviewReplyView', () => {
  it('says who replied, when, what they wrote, and the round Start begins', () => {
    const view = reviewReplyView(reply(), 2, NOW, { label: 'No new commits', tone: 'quiet' })
    expect(view).toMatchObject({
      offerId: 'o2',
      who: 'Aashan replied',
      text: 'Pushed the fix for the empty state.',
      preview: 'Pushed the fix for the empty state.',
      cut: false,
      files: 0,
      round: 3,
      startLabel: 'Start round 3',
      commits: { label: 'No new commits', tone: 'quiet' },
    })
    expect(view.line).toBe(`Aashan replied · ${view.when} · No new commits`)
    expect(view).not.toHaveProperty('filesLabel')
  })

  it('counts its files, and names someone for a reply with no author', () => {
    const view = reviewReplyView(reply({ author: '  ', files: 2 }), 1, NOW)
    expect(view.who).toBe('Someone replied')
    expect(view.filesLabel).toBe('2 files')
    expect(reviewReplyView(reply({ files: 1 }), 1, NOW).filesLabel).toBe('1 file')
    expect(view).not.toHaveProperty('commits')
    expect(view.line).toBe(`Someone replied · ${view.when}`)
  })

  it('cuts a long reply to a few lines, or a few hundred characters of one line', () => {
    const lines = ['one', 'two', 'three', 'four', 'five', 'six'].join('\n')
    const byLines = reviewReplyView(reply({ text: lines }), 1, NOW)
    expect(byLines.preview).toBe('one\ntwo\nthree\nfour')
    expect(byLines.cut).toBe(true)
    const long = 'x'.repeat(400)
    const byChars = reviewReplyView(reply({ text: long }), 1, NOW)
    expect(byChars.preview).toBe(`${'x'.repeat(280)}…`)
    expect(byChars.cut).toBe(true)
    expect(byChars.text).toBe(long)
  })
})

describe('reviewReplySources', () => {
  const offer = (over: Partial<ReviewOffer>): ReviewOffer =>
    ({
      id: 'o1',
      groupId: 'g1',
      ticketKey: 'ZNR-756',
      provider: 'slack',
      messageTs: '1.0',
      permalink: 'https://acme.slack.com/archives/C1/p1',
      author: 'Aashan',
      postedAt: '2026-11-19T11:00:00.000Z',
      text: 'Fixed',
      attachments: [{ fileId: 'f1', name: 'after.png' }],
      kind: 'next-round',
      state: 'new',
      createdAt: '2026-11-19T11:00:00.000Z',
      ...over,
    }) as ReviewOffer

  it('reads the ticket’s offers as replies, whatever the case of its key', () => {
    const sources = reviewReplySources(
      { o1: offer({}), o2: offer({ id: 'o2', ticketKey: 'ZNR-1' }) },
      'znr-756',
    )
    expect(sources).toEqual([
      {
        id: 'o1',
        kind: 'next-round',
        state: 'new',
        author: 'Aashan',
        postedAt: '2026-11-19T11:00:00.000Z',
        text: 'Fixed',
        files: 1,
      },
    ])
  })

  it('makes the paste box’s offer of one, its files named and only an https link kept', () => {
    expect(reviewReplyBoxOffer(offer({}))).toEqual({
      id: 'o1',
      author: 'Aashan',
      postedAt: '2026-11-19T11:00:00.000Z',
      permalink: 'https://acme.slack.com/archives/C1/p1',
      files: ['after.png'],
      text: 'Fixed',
    })
    expect(reviewReplyBoxOffer(offer({ permalink: 'javascript:alert(1)' }))).not.toHaveProperty(
      'permalink',
    )
  })
})
