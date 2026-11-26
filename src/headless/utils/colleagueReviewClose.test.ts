import { describe, expect, it } from 'vitest'
import type { ColleagueReview } from 'thefactory-tools/types'
import { closeReview, parseReviewSubmission, startReviewRound } from 'thefactory-tools/utils'
import {
  reviewCloseBody,
  reviewCloseConfirmView,
  reviewCloseView,
  reviewClosedLine,
} from './colleagueReviewClose'
import { REVIEW_CLOSE_NOTE_MAX_CHARS, REVIEW_CLOSE_TEXT } from './colleagueReviewCloseConstants'

const AT = '2026-11-26T09:00:00.000Z'
const NOW = Date.parse('2026-11-26T11:00:00.000Z')

const REVIEW: ColleagueReview = startReviewRound(
  undefined,
  {
    groupId: 'osc',
    ticketKey: 'ZNR-819',
    submission: parseReviewSubmission('Done', { now: AT }),
  },
  AT,
  () => 'r1',
)

const closed = (closing: Parameters<typeof closeReview>[1]) => {
  const update = closeReview(REVIEW, closing, AT)
  if (!update.ok) throw new Error('refused')
  return update.review
}

describe('reviewCloseConfirmView', () => {
  const view = reviewCloseConfirmView({ ticketKey: 'ZNR-819', runOpen: true, offersWaiting: true })

  it('asks about the ticket by its key, and offers the two outcomes, resolved first', () => {
    expect([view.title, view.outcomes.map((o) => [o.outcome, o.label])]).toEqual([
      'Close the review of ZNR-819?',
      [
        ['resolved', 'Resolved'],
        ['remove', 'Remove'],
      ],
    ])
  })

  it('says exactly what resolving keeps and ends', () => {
    expect(view.outcomes[0]?.goes).toEqual([
      'The review is kept and marked closed.',
      'Its run ends as resolved.',
      'Updates waiting on it are dismissed.',
      'A new message from the developer can start a new round.',
    ])
  })

  it('says exactly what removing deletes', () => {
    expect(view.outcomes[1]?.goes).toEqual([
      'The review and its chat are deleted.',
      'Its run ends.',
      'Its updates are dismissed, the one it started from too.',
    ])
  })

  it('leaves out the run and the updates when there are none', () => {
    const bare = reviewCloseConfirmView({
      ticketKey: 'ZNR-819',
      runOpen: false,
      offersWaiting: false,
    })
    expect(bare.outcomes.map((o) => o.goes)).toEqual([
      [
        'The review is kept and marked closed.',
        'A new message from the developer can start a new round.',
      ],
      [
        'The review and its chat are deleted.',
        'Its updates are dismissed, the one it started from too.',
      ],
    ])
  })

  it('says nothing is posted, and names each confirm by what it does', () => {
    expect([view.nothingPosted, view.confirm]).toEqual([
      'Nothing is posted to Slack or GitHub.',
      { resolved: 'Close as resolved', remove: 'Remove the review' },
    ])
  })

  it('never says a word the owner banned', () => {
    expect(JSON.stringify([view, REVIEW_CLOSE_TEXT])).not.toMatch(/\bland(ed|ing|s)?\b/i)
  })
})

describe('reviewCloseBody', () => {
  it('sends the outcome and where it was decided', () => {
    expect(reviewCloseBody('remove', '', 'mobile')).toEqual({
      outcome: 'remove',
      decidedVia: 'mobile',
    })
  })

  it('sends the note trimmed, and leaves out one of only spaces', () => {
    expect([
      reviewCloseBody('resolved', '  Ann merges it.  ', 'web'),
      reviewCloseBody('resolved', '   ', 'web'),
    ]).toEqual([
      { outcome: 'resolved', note: 'Ann merges it.', decidedVia: 'web' },
      { outcome: 'resolved', decidedVia: 'web' },
    ])
  })

  it('cuts a note at its limit', () => {
    expect(
      reviewCloseBody('resolved', 'x'.repeat(REVIEW_CLOSE_NOTE_MAX_CHARS + 5), 'web').note?.length,
    ).toBe(REVIEW_CLOSE_NOTE_MAX_CHARS)
  })
})

describe('reviewClosedLine', () => {
  it('says the person resolved it, when, and their note', () => {
    expect(reviewClosedLine(closed({ by: 'person', note: 'Ann merges it.' }).closed!, NOW)).toBe(
      'Resolved by you · 2 hours ago — “Ann merges it.”',
    )
  })

  it('says it without a note', () => {
    expect(reviewClosedLine(closed({ by: 'person' }).closed!, NOW)).toBe(
      'Resolved by you · 2 hours ago',
    )
  })

  it('says why the host settled it, in the host’s own line', () => {
    expect(
      reviewClosedLine(closed({ by: 'host', reason: 'Merged on GitHub by ann.' }).closed!, NOW),
    ).toBe('Resolved · Merged on GitHub by ann. · 2 hours ago')
  })

  it.each([
    ['agent', 'Resolved by the agent, with your approval · 2 hours ago'],
    ['manager', 'Resolved by the manager, with your approval · 2 hours ago'],
    ['host', 'Resolved · 2 hours ago'],
  ] as const)('says who when %s closed it', (by, line) => {
    expect(reviewClosedLine(closed({ by }).closed!, NOW)).toBe(line)
  })
})

describe('reviewCloseView', () => {
  const none = { review: REVIEW, closing: undefined, error: undefined }

  it('offers the action on an open review', () => {
    expect(reviewCloseView(none, NOW)).toEqual({ state: 'open', label: 'Close this review' })
  })

  it('offers nothing until the review is read, and nothing for a ticket with none', () => {
    expect([
      reviewCloseView({ ...none, review: undefined }, NOW),
      reviewCloseView({ ...none, review: null }, NOW),
    ]).toEqual([{ state: 'none' }, { state: 'none' }])
  })

  it('shows a resolved review closed, with its line, and no action', () => {
    expect(reviewCloseView({ ...none, review: closed({ by: 'person' }) }, NOW)).toEqual({
      state: 'resolved',
      line: 'Resolved by you · 2 hours ago',
    })
  })

  it('shows a review being removed as removed at once', () => {
    expect(reviewCloseView({ ...none, review: null, closing: 'remove' }, NOW)).toEqual({
      state: 'removed',
      line: 'Review removed.',
    })
  })

  it('offers the action again, with why, when closing failed', () => {
    expect(reviewCloseView({ ...none, error: 'Backend down' }, NOW)).toEqual({
      state: 'open',
      label: 'Close this review',
      error: 'Backend down',
    })
  })
})
