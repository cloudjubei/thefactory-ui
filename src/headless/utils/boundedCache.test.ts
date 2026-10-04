import { describe, expect, it } from 'vitest'

import { BoundedCache } from './boundedCache'

describe('BoundedCache', () => {
  it('answers what was set, and nothing for a key it never held', () => {
    const cache = new BoundedCache<number>(2)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
  })

  it('keeps a falsy value as an entry', () => {
    const cache = new BoundedCache<number>(2)
    cache.set('zero', 0)
    expect(cache.get('zero')).toBe(0)
  })

  it('drops the least recently used entry past its capacity', () => {
    const cache = new BoundedCache<number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a')
    cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
    expect(cache.size).toBe(2)
  })

  it('counts a re-set key once and moves it to most recent', () => {
    const cache = new BoundedCache<number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 10)
    cache.set('c', 3)
    expect(cache.get('a')).toBe(10)
    expect(cache.get('b')).toBeUndefined()
  })

  it('lists its values oldest first without reordering them', () => {
    const cache = new BoundedCache<number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.values()).toEqual([1, 2])
    expect(cache.values()).toEqual([1, 2])
  })

  it('deletes one entry, and clears them all', () => {
    const cache = new BoundedCache<number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('holds at least one entry whatever capacity it is given', () => {
    const cache = new BoundedCache<number>(0)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })
})
