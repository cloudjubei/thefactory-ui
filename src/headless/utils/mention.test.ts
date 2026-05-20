import { describe, expect, it } from 'vitest'
import { applyMention, parseMention, rankMentionMatches } from './mention'

describe('parseMention', () => {
  it('returns null when cursor is out of range', () => {
    expect(parseMention('hi', -1)).toBeNull()
    expect(parseMention('hi', 5)).toBeNull()
  })

  it('returns null when cursor is not inside a mention', () => {
    expect(parseMention('hello world', 5)).toBeNull()
  })

  it('parses a mention at the start of the text', () => {
    expect(parseMention('@foo', 4)).toEqual({ token: 'foo', start: 0, end: 4 })
  })

  it('parses a mention preceded by whitespace', () => {
    expect(parseMention('hi @bar', 7)).toEqual({ token: 'bar', start: 3, end: 7 })
  })

  it('rejects an `@` preceded by a non-space char', () => {
    expect(parseMention('email@host', 10)).toBeNull()
  })

  it('returns null if a whitespace appears inside the candidate token', () => {
    expect(parseMention('@foo bar', 8)).toBeNull()
  })
})

describe('rankMentionMatches', () => {
  it('returns the first N paths when token is empty', () => {
    expect(rankMentionMatches(['a', 'b', 'c'], '', 2)).toEqual(['a', 'b'])
  })

  it('prefers prefix matches over infix matches', () => {
    const out = rankMentionMatches(['src/foo.ts', 'foo.md'], 'foo')
    expect(out[0]).toBe('foo.md')
  })

  it('prefers shorter paths at equal match position', () => {
    const out = rankMentionMatches(['foo.ts', 'foo.long.ts'], 'foo')
    expect(out[0]).toBe('foo.ts')
  })

  it('is case-insensitive', () => {
    expect(rankMentionMatches(['Foo.ts'], 'foo')).toEqual(['Foo.ts'])
  })

  it('caps results at limit', () => {
    expect(rankMentionMatches(['a', 'aa', 'aaa'], 'a', 2)).toHaveLength(2)
  })
})

describe('applyMention', () => {
  it('replaces the @token range with @path + trailing space', () => {
    const parse = { token: 'fo', start: 0, end: 3 }
    const out = applyMention('@fo', parse, 'foo.ts')
    expect(out).toEqual({ text: '@foo.ts ', cursor: 8 })
  })

  it('preserves text before and after the token range', () => {
    const text = 'hi @b world'
    const parse = { token: 'b', start: 3, end: 5 }
    const out = applyMention(text, parse, 'bar')
    expect(out.text).toBe('hi @bar  world')
    expect(out.cursor).toBe(8)
  })
})
