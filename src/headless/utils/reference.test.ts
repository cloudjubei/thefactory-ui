import { describe, expect, it } from 'vitest'
import { applyReference, parseReference } from './reference'

describe('parseReference', () => {
  it('reads the token after a # at the start or after whitespace', () => {
    expect(parseReference('see #3.', 7)).toEqual({ sigil: '#', token: '3.', start: 4, end: 7 })
    expect(parseReference('#ab', 3)).toEqual({ sigil: '#', token: 'ab', start: 0, end: 3 })
  })

  it('reads an & token only when asked for that sigil', () => {
    expect(parseReference('use &qa', 7)).toBeNull()
    expect(parseReference('use &qa', 7, '&')).toEqual({ sigil: '&', token: 'qa', start: 4, end: 7 })
  })

  it('is null inside a word, after whitespace, or out of range', () => {
    expect(parseReference('R&D', 3, '&')).toBeNull()
    expect(parseReference('#a b', 4)).toBeNull()
    expect(parseReference('#a', 5)).toBeNull()
  })
})

describe('applyReference', () => {
  it('replaces the token with the picked value under the same sigil, caret after it', () => {
    const parse = parseReference('use &qa now', 7, '&')!
    expect(applyReference('use &qa now', parse, 'qa-login')).toEqual({
      text: 'use &qa-login  now',
      cursor: 14,
    })
    const hash = parseReference('see #3', 6)!
    expect(applyReference('see #3', hash, '3.2')).toEqual({ text: 'see #3.2 ', cursor: 9 })
  })
})
