import { describe, expect, it } from 'vitest'
import { parseAppElementPick } from './appSelections'

describe('App element picks', () => {
  it('preserves a selector, inert HTML and finite app viewport rectangle', () => {
    expect(
      parseAppElementPick({
        selector: '#save',
        outerHtml: '<button id="save">Save</button>',
        rect: { x: 1, y: 2, width: 3, height: 4 },
      }),
    ).toEqual({
      selector: '#save',
      outerHtml: '<button id="save">Save</button>',
      rect: { x: 1, y: 2, width: 3, height: 4 },
    })
  })
  it('rejects malformed picks and caps the snippet', () => {
    for (const value of [
      null,
      {},
      { selector: '', outerHtml: '<p />' },
      { selector: '#x', outerHtml: 3 },
    ])
      expect(parseAppElementPick(value)).toBeNull()
    expect(
      parseAppElementPick({
        selector: '#x',
        outerHtml: 'x'.repeat(21_000),
        rect: { x: NaN, y: 0, width: 1, height: 1 },
      }),
    ).toEqual({ selector: '#x', outerHtml: 'x'.repeat(20_000) })
  })
})
