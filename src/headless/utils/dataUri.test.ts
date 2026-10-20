import { describe, expect, it } from 'vitest'
import { parseDataUri } from './dataUri'

describe('parseDataUri', () => {
  it('reads a base64 image', () => {
    expect(parseDataUri('data:image/png;base64,iVBORw0KGgo=')).toEqual({
      mediaType: 'image/png',
      encoding: 'base64',
      data: 'iVBORw0KGgo=',
    })
  })

  it('decodes a percent-encoded text body and keeps its charset out of the media type', () => {
    expect(parseDataUri('data:text/markdown;charset=utf-8,%23%20Report%0A%E2%9C%93')).toEqual({
      mediaType: 'text/markdown',
      encoding: 'utf8',
      data: '# Report\n✓',
    })
  })

  it('reads base64 that follows other parameters', () => {
    expect(parseDataUri('data:video/mp4;codecs=avc1;base64,AAAA')).toEqual({
      mediaType: 'video/mp4',
      encoding: 'base64',
      data: 'AAAA',
    })
  })

  it('falls back to plain text when the media type is left out', () => {
    expect(parseDataUri('data:,hello%20there')).toEqual({
      mediaType: 'text/plain',
      encoding: 'utf8',
      data: 'hello there',
    })
  })

  it('reads a text body that mentions base64 as text', () => {
    expect(parseDataUri('data:text/plain,base64%20is%20an%20encoding')).toEqual({
      mediaType: 'text/plain',
      encoding: 'utf8',
      data: 'base64 is an encoding',
    })
  })

  it('keeps a comma inside the body', () => {
    expect(parseDataUri('data:text/plain,a,b')?.data).toBe('a,b')
  })

  it('lower-cases the media type', () => {
    expect(parseDataUri('data:Image/PNG;base64,AA==')?.mediaType).toBe('image/png')
  })

  it.each([
    '',
    'https://example.com/a.png',
    'https://example.com/a,b.png',
    'data:image/png;base64',
    'data:text/plain,%E0%A4%A',
  ])('rejects %j', (uri) => {
    expect(parseDataUri(uri)).toBeNull()
  })
})
