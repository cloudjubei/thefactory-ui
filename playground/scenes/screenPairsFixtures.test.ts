import { describe, expect, it } from 'vitest'
import { measuredScreenPairs, SCREEN_PAIR_TILES } from './screenPairsFixtures'

describe('measured Screens showcase', () => {
  it('keeps chronological inputs and derives measured classes, order and original numbers', () => {
    expect(SCREEN_PAIR_TILES.map((tile) => tile.ref.id)).toEqual([
      'Account-before',
      'Account-after',
      'Checkout-before',
      'Checkout-after',
      'Gallery-before',
      'Gallery-after',
      'Legacy-before',
      'Legacy-after',
    ])
    expect(measuredScreenPairs().map(({ key, index, class: kind }) => [key, index, kind])).toEqual([
      ['Checkout', 2, 'changed'],
      ['Account', 1, 'unchanged'],
      ['Gallery', 3, 'unavailable'],
      ['Legacy', 4, 'pair'],
    ])
  })

  it('supplies fixed, loaded two-sided images and selects each overlay by key, not position', () => {
    const pairs = measuredScreenPairs()
    for (const subject of ['Account', 'Checkout', 'Gallery', 'Legacy']) {
      const pair = pairs.find((candidate) => candidate.key === subject)!
      expect(pair.before?.ref.id).toBe(`${subject}-before`)
      expect(pair.after?.ref.id).toBe(`${subject}-after`)
      expect(pair.before?.dataUri).toMatch(/^data:image\/svg\+xml,/)
      expect(pair.after?.dataUri).toMatch(/^data:image\/svg\+xml,/)
      if (subject === 'Checkout') expect(pair.before?.dataUri).not.toBe(pair.after?.dataUri)
      else expect(pair.before?.dataUri).toBe(pair.after?.dataUri)
    }
    expect(measuredScreenPairs()).toEqual(pairs)
  })
})
