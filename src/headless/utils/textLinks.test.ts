import { describe, expect, it } from 'vitest'
import { splitReferences } from 'thefactory-tools/utils'
import { splitTextLinks } from './textLinks'

const URL = 'https://zenor.atlassian.net/browse/ZNR-780'

describe('splitTextLinks', () => {
  it('leaves text with no link as it is', () => {
    expect(splitTextLinks('Just words.')).toEqual([{ type: 'text', value: 'Just words.' }])
  })

  it('has nothing to split in an empty text', () => {
    expect(splitTextLinks('')).toEqual([])
  })

  it('finds a link inside a sentence, keeping what is around it', () => {
    expect(splitTextLinks(`Let's discuss [ZNR-780](${URL}).`)).toEqual([
      { type: 'text', value: "Let's discuss " },
      { type: 'link', label: 'ZNR-780', url: URL },
      { type: 'text', value: '.' },
    ])
  })

  it('finds several, and one that opens the text', () => {
    expect(splitTextLinks('[a](https://a.io) and [b](http://b.io)')).toEqual([
      { type: 'link', label: 'a', url: 'https://a.io' },
      { type: 'text', value: ' and ' },
      { type: 'link', label: 'b', url: 'http://b.io' },
    ])
  })

  it.each([
    ['a script', '[x](javascript:alert(1))'],
    ['a data page', '[x](data:text/html,hi)'],
    ['a file', '[x](file:///etc/hosts)'],
    ['a bare path', '[x](/etc/hosts)'],
    ['brackets alone', '[x]'],
  ])('leaves %s as text: only a web page opens', (_name, text) => {
    expect(splitTextLinks(text)).toEqual([{ type: 'text', value: text }])
  })

  it('reads the same after a message is split into its references', () => {
    const [first] = splitReferences(`Let's discuss [ZNR-780](${URL}).`)
    expect(first).toMatchObject({ type: 'text' })
    expect(splitTextLinks((first as { value: string }).value)).toContainEqual({
      type: 'link',
      label: 'ZNR-780',
      url: URL,
    })
  })
})
