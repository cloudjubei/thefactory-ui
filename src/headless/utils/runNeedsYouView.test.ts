import { describe, expect, it } from 'vitest'
import { processNeedsYouItemId } from 'thefactory-tools/utils'
import type { ProcessNeedsYouResolution } from 'thefactory-tools/types'

import { runNeedsYouDiscussDraft, runNeedsYouView } from './runNeedsYouView'
import {
  NEEDS_YOU_ALL_DECIDED,
  NEEDS_YOU_FINE_OUTCOME,
  NEEDS_YOU_NOTHING,
  NEEDS_YOU_QUOTE_HEADING,
} from './runNeedsYouViewConstants'

const VERIFY = 'Sign-off despite Verify failing — decide whether the logs are enough.'
const CACHING = 'Decide whether a transient pdfjs failure should stay cached.'

function settled(
  text: string,
  over: Partial<ProcessNeedsYouResolution> = {},
): Record<string, ProcessNeedsYouResolution> {
  const itemId = processNeedsYouItemId(text)
  return { [itemId]: { itemId, text, kind: 'resolved', at: 1, ...over } }
}

describe('runNeedsYouView', () => {
  it('gives each item a card with its id, in the report’s order, open', () => {
    const view = runNeedsYouView([VERIFY, CACHING], undefined)
    expect(view.cards.map((c) => [c.id, c.open])).toEqual([
      [processNeedsYouItemId(VERIFY), true],
      [processNeedsYouItemId(CACHING), true],
    ])
  })

  it('never makes a card of the run’s own pending merge', () => {
    const notMerged =
      'Not merged. The work is still on the review branch and has not been merged into the feature branch or main.'
    expect(runNeedsYouView([notMerged, CACHING], undefined).cards.map((c) => c.text)).toEqual([
      CACHING,
    ])
  })

  it('reads a leading phrase as the card’s title and the rest as its body', () => {
    const [card] = runNeedsYouView([VERIFY], undefined).cards
    expect(card).toMatchObject({
      title: 'Sign-off despite Verify failing',
      body: 'decide whether the logs are enough.',
      text: VERIFY,
    })
  })

  it('keeps an item with no leading phrase whole as its title', () => {
    const [card] = runNeedsYouView([CACHING], undefined).cards
    expect(card).toMatchObject({ title: CACHING, body: undefined })
  })

  it('keeps an item whole when its first separator comes too late to be a title', () => {
    const long = `${'word '.repeat(20)}— and then the rest.`
    expect(runNeedsYouView([long], undefined).cards[0].body).toBeUndefined()
  })

  it('says how many decisions are left, and draws attention while any are', () => {
    const view = runNeedsYouView([VERIFY, CACHING], settled(CACHING))
    expect(view).toMatchObject({ openCount: 1, summary: '1 decision left', attention: true })
    expect(runNeedsYouView([VERIFY, CACHING], undefined).summary).toBe('2 decisions left')
  })

  it('says all is decided once every item is settled', () => {
    expect(runNeedsYouView([CACHING], settled(CACHING))).toMatchObject({
      openCount: 0,
      summary: NEEDS_YOU_ALL_DECIDED,
      attention: false,
    })
  })

  it('says nothing is left when the report left nothing', () => {
    expect(runNeedsYouView([], undefined)).toMatchObject({
      cards: [],
      summary: NEEDS_YOU_NOTHING,
      attention: false,
    })
  })

  it('notes an item marked fine as it is', () => {
    const [card] = runNeedsYouView([CACHING], settled(CACHING, { summary: 'Fine as it is' })).cards
    expect(card).toMatchObject({ open: false, outcome: NEEDS_YOU_FINE_OUTCOME })
  })

  it('quotes a decision in the person’s words', () => {
    const [card] = runNeedsYouView([CACHING], settled(CACHING, { summary: 'Keep it cached' })).cards
    expect(card.outcome).toBe('Decided: Keep it cached')
  })

  it('says an item was left for later', () => {
    const [card] = runNeedsYouView(
      [CACHING],
      settled(CACHING, { kind: 'deferred', summary: 'Next sprint' }),
    ).cards
    expect(card.outcome).toBe('Left for later: Next sprint')
  })

  it('says a feature was added to the run for it', () => {
    const [card] = runNeedsYouView(
      [CACHING],
      settled(CACHING, {
        kind: 'changed',
        change: { kind: 'feature-added', featureId: 'f2', title: 'Cap PDF size' },
      }),
    ).cards
    expect(card.outcome).toBe('Added “Cap PDF size” to this run — sign-off waits for it')
  })

  it('says a feature was changed and sent back for it', () => {
    const [card] = runNeedsYouView(
      [CACHING],
      settled(CACHING, {
        kind: 'changed',
        change: { kind: 'feature-changed', featureId: 'f1', title: 'Read PDFs' },
      }),
    ).cards
    expect(card.outcome).toBe('Changed “Read PDFs” and sent it back for a fix pass')
  })

  it('says a new story was created for it', () => {
    const [card] = runNeedsYouView(
      [CACHING],
      settled(CACHING, {
        kind: 'changed',
        change: { kind: 'story-created', storyId: 's2', title: 'Test robustness' },
      }),
    ).cards
    expect(card.outcome).toBe('New story “Test robustness” created')
  })
})

describe('runNeedsYouDiscussDraft', () => {
  it('quotes the item under its heading and leaves a line to write on', () => {
    expect(runNeedsYouDiscussDraft(CACHING)).toBe(
      `> **${NEEDS_YOU_QUOTE_HEADING}**\n> ${CACHING}\n\n`,
    )
  })

  it('quotes every line of a multi-line item', () => {
    expect(runNeedsYouDiscussDraft('one\ntwo')).toBe(
      `> **${NEEDS_YOU_QUOTE_HEADING}**\n> one\n> two\n\n`,
    )
  })
})
