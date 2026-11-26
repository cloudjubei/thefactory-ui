import { describe, expect, it } from 'vitest'
import {
  reviewBoxOf,
  reviewBoxProblem,
  reviewBoxWithOffer,
  reviewChatContext,
  reviewDraftProblem,
  reviewOfChat,
  reviewStartBody,
  reviewStartedDestination,
  reviewStartLabel,
  reviewStartMode,
  withReviewFiles,
} from './colleagueReviewStart'
import { COLLEAGUE_REVIEW_FILES_MAX } from './colleagueReviewStartConstants'
import type { ReviewOffer, TicketReviewOffer } from './colleagueReviewSourceTypes'
import type { ReviewPasteBox } from './colleagueReviewStartTypes'

const file = (name: string, size = 10) => ({ name, size, uri: `file:///${name}` })

describe('reviewChatContext', () => {
  it('is the ticket’s review topic in the group', () => {
    expect(reviewChatContext('osc', 'ZNR-809')).toEqual({
      type: 'GROUP_TOPIC',
      groupId: 'osc',
      topicId: 'review-ZNR-809',
    })
  })
})

describe('reviewOfChat', () => {
  it('reads the review from a review chat’s context or its id', () => {
    expect(reviewOfChat(reviewChatContext('osc', 'ZNR-809'))).toEqual({
      groupId: 'osc',
      ticketKey: 'ZNR-809',
    })
    expect(reviewOfChat('groups/osc/topics/review-ZNR-809')).toEqual({
      groupId: 'osc',
      ticketKey: 'ZNR-809',
    })
  })

  it('finds none in any other chat', () => {
    expect(reviewOfChat('groups/osc/topics/ticket-ZNR-809')).toBeUndefined()
    expect(reviewOfChat('groups/osc/topics/review-')).toBeUndefined()
    expect(reviewOfChat({ type: 'GROUP', groupId: 'osc' })).toBeUndefined()
    expect(reviewOfChat({ type: 'GROUP_TOPIC', topicId: 'review-A-1' })).toBeUndefined()
    expect(reviewOfChat(undefined)).toBeUndefined()
  })
})

describe('reviewStartLabel', () => {
  it('counts the files going up, then says the round is starting', () => {
    expect(reviewStartLabel({ step: 'uploading', done: 2, total: 6 })).toBe('Files 2/6…')
    expect(reviewStartLabel({ step: 'starting' })).toBe('Starting…')
  })
})

describe('reviewDraftProblem', () => {
  it('wants some text, no more than the backend takes', () => {
    expect(reviewDraftProblem({ text: '  \n', files: [] })).toBe('Paste their update first.')
    expect(reviewDraftProblem({ text: 'x'.repeat(100_001), files: [] })).toBe(
      'The update is longer than 100,000 characters.',
    )
    expect(
      reviewDraftProblem({
        text: 'ok',
        files: Array.from({ length: COLLEAGUE_REVIEW_FILES_MAX + 1 }, (_, i) => ({
          file: file(`${i}.png`),
        })),
      }),
    ).toBe('Up to 50 files.')
    expect(
      reviewDraftProblem({ text: 'ok', files: [{ file: file('huge.mp4', 3 * 1024 ** 3) }] }),
    ).toMatch(/^huge\.mp4 /)
    expect(
      reviewDraftProblem({ text: 'ok', files: [{ file: { name: 'clip.mp4', uri: 'file:///c' } }] }),
    ).toBeUndefined()
    expect(reviewDraftProblem({ text: 'Done, see PR 390.', files: [] })).toBeUndefined()
  })
})

describe('withReviewFiles', () => {
  it('adds files once each, keeping those already uploaded', () => {
    const kept = [{ file: file('a.png'), path: 'up/a.png' }]
    expect(withReviewFiles(kept, [file('a.png'), file('b.md'), file('a.png', 11)])).toEqual([
      { file: file('a.png'), path: 'up/a.png' },
      { file: file('b.md') },
      { file: file('a.png', 11) },
    ])
  })

  it('stops at the backend’s limit', () => {
    const many = Array.from({ length: COLLEAGUE_REVIEW_FILES_MAX + 5 }, (_, i) => file(`${i}.png`))
    expect(withReviewFiles([], many)).toHaveLength(COLLEAGUE_REVIEW_FILES_MAX)
  })
})

const PERMALINK = 'https://acme.slack.com/archives/C07/p1763380000123456'

const ON_TICKET: TicketReviewOffer = {
  id: 'offer-1',
  kind: 'next-round',
  author: 'Ana',
  postedAt: '2026-11-17T10:00:00.000Z',
  permalink: PERMALINK,
  state: 'new',
  files: 0,
}

const OFFER: ReviewOffer = {
  ...ON_TICKET,
  groupId: 'osc',
  ticketKey: 'OSC-402',
  provider: 'slack',
  messageTs: '1763380000.123456',
  text: 'OSC-402 fixed, PR 391, Loom 2:10-3:40',
  attachments: [
    { fileId: 'F1', name: 'after.png', size: 120 },
    { fileId: 'F2', name: 'call.mp4' },
  ],
  state: 'new',
  createdAt: '2026-11-17T10:00:05.000Z',
}

describe('reviewBoxOf', () => {
  it('opens on a ticket’s update, its text and files once they are read', () => {
    expect(reviewBoxOf('OSC-402', true, ON_TICKET, OFFER)).toEqual({
      ticketKey: 'OSC-402',
      nextRound: true,
      draft: { text: OFFER.text, files: [] },
      offer: {
        id: 'offer-1',
        author: 'Ana',
        postedAt: ON_TICKET.postedAt,
        permalink: PERMALINK,
        files: ['after.png', 'call.mp4'],
        text: OFFER.text,
      },
    })
  })

  it('opens at once while the update is read, empty', () => {
    expect(reviewBoxOf('OSC-402', false, ON_TICKET, undefined)).toEqual({
      ticketKey: 'OSC-402',
      nextRound: false,
      draft: { text: '', files: [] },
      offer: {
        id: 'offer-1',
        author: 'Ana',
        postedAt: ON_TICKET.postedAt,
        permalink: PERMALINK,
        files: [],
      },
    })
  })

  it('drops a link that is not https', () => {
    expect(
      reviewBoxOf('OSC-402', false, { ...ON_TICKET, permalink: 'javascript:x' }, undefined).offer,
    ).not.toHaveProperty('permalink')
  })
})

describe('reviewBoxWithOffer', () => {
  const waiting = reviewBoxOf('OSC-402', false, ON_TICKET, undefined)

  it('fills a box still waiting on its update', () => {
    expect(reviewBoxWithOffer(waiting, OFFER)).toEqual(
      reviewBoxOf('OSC-402', false, ON_TICKET, OFFER),
    )
  })

  it('keeps what the person typed meanwhile', () => {
    const typed = { ...waiting, draft: { text: 'My own words', files: [] } }
    const filled = reviewBoxWithOffer(typed, OFFER)
    expect(filled.draft.text).toBe('My own words')
    expect(filled.offer?.text).toBe(OFFER.text)
  })

  it('leaves another ticket’s box, or one with no update, as it is', () => {
    const other = { ...OFFER, id: 'offer-9' }
    expect(reviewBoxWithOffer(waiting, other)).toBe(waiting)
    const plain: ReviewPasteBox = {
      ticketKey: 'OSC-402',
      nextRound: false,
      draft: { text: '', files: [] },
    }
    expect(reviewBoxWithOffer(plain, OFFER)).toBe(plain)
  })
})

describe('reviewBoxProblem', () => {
  const filled = reviewBoxOf('OSC-402', false, ON_TICKET, OFFER)

  it('holds Start while the update is read', () => {
    expect(reviewBoxProblem(reviewBoxOf('OSC-402', false, ON_TICKET, undefined))).toBe(
      'Reading the update…',
    )
  })

  it('takes an update’s own text, edited or not, but not emptied', () => {
    expect(reviewBoxProblem(filled)).toBeUndefined()
    expect(reviewBoxProblem({ ...filled, draft: { text: 'Edited', files: [] } })).toBeUndefined()
    expect(reviewBoxProblem({ ...filled, draft: { text: ' ', files: [] } })).toBe(
      'Paste their update first.',
    )
  })

  it('takes an update that came with files alone and no words', () => {
    const filesOnly = reviewBoxOf('OSC-402', false, ON_TICKET, { ...OFFER, text: '' })
    expect(reviewBoxProblem(filesOnly)).toBeUndefined()
    expect(
      reviewBoxProblem({ ...filesOnly, draft: { text: 'x'.repeat(100_001), files: [] } }),
    ).toBe('The update is longer than 100,000 characters.')
  })

  it('is the draft’s own problem without an update', () => {
    expect(
      reviewBoxProblem({ ticketKey: 'OSC-1', nextRound: false, draft: { text: '', files: [] } }),
    ).toBe('Paste their update first.')
  })
})

describe('reviewStartBody', () => {
  const filled = reviewBoxOf('OSC-402', false, ON_TICKET, OFFER)

  it('sends the pasted text and the files’ paths', () => {
    expect(
      reviewStartBody(
        { ticketKey: 'OSC-1', nextRound: false, draft: { text: 'Done', files: [] } },
        ['up/a.png'],
      ),
    ).toEqual({ text: 'Done', attachments: ['up/a.png'] })
    expect(
      reviewStartBody(
        { ticketKey: 'OSC-1', nextRound: false, draft: { text: 'Done', files: [] } },
        [],
      ),
    ).toEqual({ text: 'Done' })
  })

  it('sends the update by its id, its text only once the person changed it', () => {
    expect(reviewStartBody(filled, [])).toEqual({ offerId: 'offer-1' })
    expect(
      reviewStartBody({ ...filled, draft: { text: 'Edited', files: [] } }, ['up/b.md']),
    ).toEqual({ offerId: 'offer-1', text: 'Edited', attachments: ['up/b.md'] })
  })

  it('says how the round is reviewed when told', () => {
    expect(reviewStartBody(filled, [], 'process')).toEqual({ offerId: 'offer-1', mode: 'process' })
    expect(reviewStartBody(filled, [], 'inline')).toEqual({ offerId: 'offer-1', mode: 'inline' })
  })
})

describe('reviewStartMode', () => {
  it('is the person’s pick, else the group’s default, else in chat', () => {
    expect(reviewStartMode('inline', 'process')).toBe('inline')
    expect(reviewStartMode(undefined, 'process')).toBe('process')
    expect(reviewStartMode(undefined, 'inline')).toBe('inline')
    expect(reviewStartMode(undefined, undefined)).toBe('inline')
  })
})

describe('reviewStartedDestination', () => {
  const context = { type: 'GROUP_TOPIC' as const, groupId: 'osc', topicId: 'review-OSC-1' }

  it('is the run a round started as a run is reviewed in, in the run’s own project, never a chat', () => {
    expect(
      reviewStartedDestination({ mode: 'process', runId: 'run-1', projectId: 'osc-be' }),
    ).toEqual({ kind: 'run', projectId: 'osc-be', runId: 'run-1' })
  })

  it('is the review chat for a round reviewed inline', () => {
    expect(reviewStartedDestination({ mode: 'inline', context })).toEqual({
      kind: 'chat',
      context,
    })
  })
})
