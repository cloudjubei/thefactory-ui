import { describe, expect, it } from 'vitest'

import { clipLine, firstSentence, plainMarkdownLine } from './textLine'

describe('clipLine', () => {
  it('keeps a short line whole, collapsing its whitespace', () => {
    expect(clipLine('  Approved\n  nothing   blocks ', 40)).toBe('Approved nothing blocks')
  })

  it('cuts a long line at a word and marks the cut', () => {
    expect(clipLine('Search parses every PDF in the tree on each query', 24)).toBe(
      'Search parses every PDF…',
    )
  })

  it('drops trailing punctuation before the ellipsis', () => {
    expect(clipLine('Approved, three minor findings remain open', 10)).toBe('Approved…')
  })

  it('cuts inside a word when no word break comes late enough', () => {
    expect(clipLine('Supercalifragilistic expialidocious', 8)).toBe('Superca…')
  })
})

describe('firstSentence', () => {
  it('reads up to the first sentence break', () => {
    expect(firstSentence('Nothing blocks merging. Three minor findings remain.')).toBe(
      'Nothing blocks merging.',
    )
  })

  it('takes a question or exclamation as a break too', () => {
    expect(firstSentence('Is it done? Mostly.')).toBe('Is it done?')
  })

  it('returns the whole line when there is no break', () => {
    expect(firstSentence('Approved with\nminor notes')).toBe('Approved with minor notes')
  })

  it('does not break inside a dotted name', () => {
    expect(firstSentence('Reads FileTools.ts fully. Done.')).toBe('Reads FileTools.ts fully.')
  })
})

describe('plainMarkdownLine', () => {
  it('drops bold, code and italic marks, keeping their words', () => {
    expect(
      plainMarkdownLine('**Sign-off despite Verify failing.** See `src/a.ts` and _the log_.'),
    ).toBe('Sign-off despite Verify failing. See src/a.ts and the log.')
  })

  it('keeps a link’s text', () => {
    expect(plainMarkdownLine('Read [the spec](https://x.test/spec) first')).toBe(
      'Read the spec first',
    )
  })

  it('leaves a lone asterisk or snake_case word alone', () => {
    expect(plainMarkdownLine('2 * 3 in max_chars')).toBe('2 * 3 in max_chars')
  })
})
