import { describe, expect, it } from 'vitest'

import {
  listDragSlot,
  listMoveTarget,
  listRowShift,
  listSettleOffset,
  listSlotTops,
} from './listDragSlots'

const heights = [40, 60, 40, 80]

describe('listSlotTops', () => {
  it('is where each row starts, the first at 0', () => {
    expect(listSlotTops(heights)).toEqual([0, 40, 100, 140])
    expect(listSlotTops([])).toEqual([])
  })
})

describe('listDragSlot', () => {
  it('stays in its own slot until its middle passes a neighbour’s middle', () => {
    expect(listDragSlot(heights, 1, 70)).toBe(1)
    expect(listDragSlot(heights, 1, 119)).toBe(1)
    expect(listDragSlot(heights, 1, 120)).toBe(1)
    expect(listDragSlot(heights, 1, 121)).toBe(2)
    expect(listDragSlot(heights, 1, 19)).toBe(0)
  })

  it('reaches the first and the last slot past the ends', () => {
    expect(listDragSlot(heights, 2, -500)).toBe(0)
    expect(listDragSlot(heights, 0, 5000)).toBe(3)
  })

  it('is its own slot in a list of one', () => {
    expect(listDragSlot([50], 0, 900)).toBe(0)
  })
})

describe('listRowShift', () => {
  it('moves the rows it passes over by its height, toward where it came from', () => {
    expect(listRowShift(2, 1, 3, 60)).toBe(-60)
    expect(listRowShift(3, 1, 3, 60)).toBe(-60)
    expect(listRowShift(0, 2, 0, 40)).toBe(40)
    expect(listRowShift(1, 2, 0, 40)).toBe(40)
  })

  it('leaves every other row, and the dragged row itself, where it is', () => {
    expect(listRowShift(0, 1, 3, 60)).toBe(0)
    expect(listRowShift(3, 2, 0, 40)).toBe(0)
    expect(listRowShift(1, 1, 3, 60)).toBe(0)
    expect(listRowShift(2, 1, 1, 60)).toBe(0)
  })
})

describe('listSettleOffset', () => {
  it('is how far the dragged row travels to sit in its new slot', () => {
    expect(listSettleOffset(heights, 1, 3)).toBe(120)
    expect(listSettleOffset(heights, 3, 1)).toBe(-100)
    expect(listSettleOffset(heights, 0, 1)).toBe(60)
    expect(listSettleOffset(heights, 2, 2)).toBe(0)
  })
})

describe('listMoveTarget', () => {
  const visible = ['a', 'c', 'e']

  it('drops beside the row it was moved past, on the side it came from', () => {
    expect(listMoveTarget(visible, 0, 2)).toEqual({ id: 'e', side: 'after' })
    expect(listMoveTarget(visible, 2, 0)).toEqual({ id: 'a', side: 'before' })
    expect(listMoveTarget(visible, 1, 2)).toEqual({ id: 'e', side: 'after' })
  })

  it('is no move for a row put back in its own slot, or a slot the list does not have', () => {
    expect(listMoveTarget(visible, 1, 1)).toBeUndefined()
    expect(listMoveTarget(visible, 0, 3)).toBeUndefined()
    expect(listMoveTarget(visible, -1, 0)).toBeUndefined()
  })
})
