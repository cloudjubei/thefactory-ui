import { describe, expect, it } from 'vitest'
import { ProjectResourceCache } from './projectResourceCache'

describe('ProjectResourceCache', () => {
  it('returns undefined for unknown keys', () => {
    const cache = new ProjectResourceCache<number>()
    expect(cache.get('p1')).toBeUndefined()
  })

  it('stores and retrieves data + etag', () => {
    const cache = new ProjectResourceCache<number>()
    cache.set('p1', 42, 'W/"abc"')
    expect(cache.get('p1')).toEqual({ data: 42, etag: 'W/"abc"' })
  })

  it('accepts a null etag (when the backend did not advertise one)', () => {
    const cache = new ProjectResourceCache<number>()
    cache.set('p1', 7, null)
    expect(cache.get('p1')).toEqual({ data: 7, etag: null })
  })

  it('overwrites an existing entry on repeat set', () => {
    const cache = new ProjectResourceCache<number>()
    cache.set('p1', 1, 'a')
    cache.set('p1', 2, 'b')
    expect(cache.get('p1')).toEqual({ data: 2, etag: 'b' })
  })

  it('invalidate removes the entry', () => {
    const cache = new ProjectResourceCache<number>()
    cache.set('p1', 1, 'a')
    cache.invalidate('p1')
    expect(cache.get('p1')).toBeUndefined()
  })

  it('invalidate on an unknown key is a no-op', () => {
    const cache = new ProjectResourceCache<number>()
    expect(() => cache.invalidate('nope')).not.toThrow()
  })

  it('clear empties the whole cache', () => {
    const cache = new ProjectResourceCache<number>()
    cache.set('p1', 1, 'a')
    cache.set('p2', 2, 'b')
    cache.clear()
    expect(cache.get('p1')).toBeUndefined()
    expect(cache.get('p2')).toBeUndefined()
  })

  describe('LRU eviction', () => {
    it('evicts the least-recently-used entry when over capacity', () => {
      const cache = new ProjectResourceCache<number>(2)
      cache.set('p1', 1, 'a')
      cache.set('p2', 2, 'b')
      cache.set('p3', 3, 'c') // p1 is evicted
      expect(cache.get('p1')).toBeUndefined()
      expect(cache.get('p2')).toEqual({ data: 2, etag: 'b' })
      expect(cache.get('p3')).toEqual({ data: 3, etag: 'c' })
    })

    it('treats `get` as a recency touch', () => {
      const cache = new ProjectResourceCache<number>(2)
      cache.set('p1', 1, 'a')
      cache.set('p2', 2, 'b')
      cache.get('p1') // touch p1 — p2 is now LRU
      cache.set('p3', 3, 'c') // p2 evicts, not p1
      expect(cache.get('p1')).toEqual({ data: 1, etag: 'a' })
      expect(cache.get('p2')).toBeUndefined()
    })

    it('overwriting an existing key counts as a recency touch', () => {
      const cache = new ProjectResourceCache<number>(2)
      cache.set('p1', 1, 'a')
      cache.set('p2', 2, 'b')
      cache.set('p1', 11, 'aa') // p1 touched — p2 is now LRU
      cache.set('p3', 3, 'c')
      expect(cache.get('p1')).toEqual({ data: 11, etag: 'aa' })
      expect(cache.get('p2')).toBeUndefined()
    })

    it('default capacity is 16', () => {
      const cache = new ProjectResourceCache<number>()
      for (let i = 0; i < 16; i++) cache.set(`p${i}`, i, null)
      // All 16 still present
      for (let i = 0; i < 16; i++) {
        expect(cache.get(`p${i}`)).toEqual({ data: i, etag: null })
      }
      // 17th entry evicts the oldest (p0 — note all the get() calls above
      // touched p0…p15 in order, so p0 is the LRU again).
      cache.set('p16', 16, null)
      expect(cache.get('p0')).toBeUndefined()
      expect(cache.get('p16')).toEqual({ data: 16, etag: null })
    })
  })
})
