import { describe, expect, it, vi } from 'vitest'

import type { ReviewEvidenceRef } from '../api/generated'
import { EvidenceContentCache } from './evidenceContentCache'

const ref = (id: string, mediaType: string): ReviewEvidenceRef =>
  ({ id, mediaType, runId: 'r', kind: 'report', path: `${id}`, createdAt: 1 }) as ReviewEvidenceRef

function cacheWith(
  texts: (projectId: string, ids: string[]) => Promise<{ id: string; text: string }[]> = async (
    _p,
    ids,
  ) => ids.map((id) => ({ id, text: `text of ${id}` })),
) {
  const image = vi.fn(async (_p: string, id: string) => `data:${id}`)
  const readTexts = vi.fn(texts)
  return {
    cache: new EvidenceContentCache({ image, texts: readTexts }, { images: 2, notes: 50 }),
    image,
    readTexts,
  }
}

describe('EvidenceContentCache images', () => {
  it('reads an image once however many views ask for it at the same time', async () => {
    const { cache, image } = cacheWith()
    const [a, b] = await Promise.all([
      cache.loadImage('p', 'shot', 'image/png'),
      cache.loadImage('p', 'shot', 'image/png'),
    ])
    expect([a, b]).toEqual(['data:shot', 'data:shot'])
    expect(image).toHaveBeenCalledTimes(1)
    expect(cache.image('p', 'shot')).toBe('data:shot')
  })

  it('serves a later view from what was read, and keeps projects apart', async () => {
    const { cache, image } = cacheWith()
    await cache.loadImage('p', 'shot', 'image/png')
    await cache.loadImage('p', 'shot', 'image/png')
    expect(image).toHaveBeenCalledTimes(1)
    expect(cache.image('q', 'shot')).toBeUndefined()
  })

  it('reads an image again after a failed read, and keeps only the most recent few', async () => {
    const image = vi
      .fn<(p: string, id: string) => Promise<string | undefined>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(async (_p, id) => `data:${id}`)
    const cache = new EvidenceContentCache(
      { image, texts: async () => [] },
      { images: 2, notes: 5 },
    )
    expect(await cache.loadImage('p', 'a', 'image/png')).toBeUndefined()
    expect(await cache.loadImage('p', 'a', 'image/png')).toBe('data:a')
    await cache.loadImage('p', 'b', 'image/png')
    await cache.loadImage('p', 'c', 'image/png')
    expect(cache.image('p', 'a')).toBeUndefined()
    expect(cache.image('p', 'c')).toBe('data:c')
  })
})

describe('EvidenceContentCache note texts', () => {
  it('reads every readable note it does not hold in one request, and none it does', async () => {
    const { cache, readTexts } = cacheWith()
    const refs = [
      ref('n1', 'text/markdown'),
      ref('shot', 'image/png'),
      ref('n2', 'application/json'),
    ]
    expect(await cache.noteTexts('p', refs)).toEqual({ n1: 'text of n1', n2: 'text of n2' })
    expect(readTexts).toHaveBeenCalledTimes(1)
    expect(readTexts).toHaveBeenCalledWith('p', ['n1', 'n2'])

    const more = [...refs, ref('n3', 'text/plain')]
    expect(await cache.noteTexts('p', more)).toEqual({
      n1: 'text of n1',
      n2: 'text of n2',
      n3: 'text of n3',
    })
    expect(readTexts).toHaveBeenLastCalledWith('p', ['n3'])
    await cache.noteTexts('p', more)
    expect(readTexts).toHaveBeenCalledTimes(2)
  })

  it('makes no request for a listing without notes', async () => {
    const { cache, readTexts } = cacheWith()
    expect(await cache.noteTexts('p', [ref('shot', 'image/png')])).toEqual({})
    expect(readTexts).not.toHaveBeenCalled()
  })

  it('answers with what it holds when the read fails, and asks again next time', async () => {
    const readTexts = vi
      .fn<(p: string, ids: string[]) => Promise<{ id: string; text: string }[]>>()
      .mockResolvedValueOnce([{ id: 'n1', text: 'one' }])
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([{ id: 'n2', text: 'two' }])
    const cache = new EvidenceContentCache(
      { image: async () => undefined, texts: readTexts },
      { images: 2, notes: 5 },
    )
    await cache.noteTexts('p', [ref('n1', 'text/plain')])
    const refs = [ref('n1', 'text/plain'), ref('n2', 'text/plain')]
    expect(await cache.noteTexts('p', refs)).toEqual({ n1: 'one' })
    expect(await cache.noteTexts('p', refs)).toEqual({ n1: 'one', n2: 'two' })
  })

  it('splits a very long list of notes into requests the server takes', async () => {
    const { readTexts } = cacheWith()
    const cache = new EvidenceContentCache(
      { image: async () => undefined, texts: readTexts },
      { images: 2, notes: 50, textsPerRequest: 2 },
    )
    const refs = ['a', 'b', 'c'].map((id) => ref(id, 'text/plain'))
    expect(Object.keys(await cache.noteTexts('p', refs))).toEqual(['a', 'b', 'c'])
    expect(readTexts.mock.calls.map(([, ids]) => ids)).toEqual([['a', 'b'], ['c']])
  })
})
