import { describe, expect, it } from 'vitest'
import { placeToast } from './toastQueue'

type Item = { id: string; title: string }

describe('placeToast', () => {
  it('appends a toast whose id is not showing', () => {
    const items: Item[] = [{ id: 'a', title: 'A' }]
    expect(placeToast(items, { id: 'b', title: 'B' })).toEqual([
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ])
  })

  it('starts an empty queue with the toast', () => {
    expect(placeToast<Item>([], { id: 'a', title: 'A' })).toEqual([{ id: 'a', title: 'A' }])
  })

  it('replaces a showing toast with the same id in its place instead of stacking a second', () => {
    const items: Item[] = [
      { id: 'git', title: 'Old' },
      { id: 'x', title: 'X' },
    ]
    expect(placeToast(items, { id: 'git', title: 'New' })).toEqual([
      { id: 'git', title: 'New' },
      { id: 'x', title: 'X' },
    ])
  })

  it('leaves the given queue untouched', () => {
    const items: Item[] = [{ id: 'git', title: 'Old' }]
    placeToast(items, { id: 'git', title: 'New' })
    placeToast(items, { id: 'b', title: 'B' })
    expect(items).toEqual([{ id: 'git', title: 'Old' }])
  })
})
