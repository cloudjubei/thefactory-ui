import { describe, expect, it } from 'vitest'

import { listDropSide, listReorderToIndex } from './listReorder'

describe('listDropSide', () => {
  it('lands before a row in its top half and after it in its bottom half', () => {
    expect(listDropSide({ top: 100, height: 40 }, 110)).toBe('before')
    expect(listDropSide({ top: 100, height: 40 }, 119.9)).toBe('before')
    expect(listDropSide({ top: 100, height: 40 }, 120)).toBe('after')
    expect(listDropSide({ top: 100, height: 40 }, 139)).toBe('after')
  })
})

describe('listReorderToIndex', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']

  it('is where the row lands in the whole list, as the reorder call counts it', () => {
    expect(listReorderToIndex(ids, 'a', { id: 'd', side: 'after' })).toBe(3)
    expect(listReorderToIndex(ids, 'a', { id: 'd', side: 'before' })).toBe(2)
    expect(listReorderToIndex(ids, 'e', { id: 'b', side: 'before' })).toBe(1)
    expect(listReorderToIndex(ids, 'e', { id: 'a', side: 'before' })).toBe(0)
  })

  it('places a row among rows the list hides, beside the row it was dropped on', () => {
    // The list shows a, c, e (b and d are done and hidden): dropping a after c
    // lands it right after c, before the hidden d.
    expect(listReorderToIndex(ids, 'a', { id: 'c', side: 'after' })).toBe(2)
    expect(listReorderToIndex(ids, 'e', { id: 'c', side: 'before' })).toBe(2)
  })

  it('reads the sides the other way round on a list shown newest first', () => {
    expect(listReorderToIndex(ids, 'a', { id: 'd', side: 'before' }, { reversed: true })).toBe(3)
    expect(listReorderToIndex(ids, 'a', { id: 'd', side: 'after' }, { reversed: true })).toBe(2)
  })

  it('is nothing for a drop that moves nothing, on itself, or on a row it does not know', () => {
    expect(listReorderToIndex(ids, 'b', { id: 'a', side: 'after' })).toBeUndefined()
    expect(listReorderToIndex(ids, 'b', { id: 'c', side: 'before' })).toBeUndefined()
    expect(listReorderToIndex(ids, 'b', { id: 'b', side: 'after' })).toBeUndefined()
    expect(listReorderToIndex(ids, 'z', { id: 'a', side: 'before' })).toBeUndefined()
    expect(listReorderToIndex(ids, 'a', { id: 'z', side: 'before' })).toBeUndefined()
  })
})
