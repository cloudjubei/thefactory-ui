import type { ListDropTarget } from './listReorderTypes'

/*
 * Slot arithmetic for a list whose rows are dragged on a touch screen. Every
 * function here runs on the UI thread while a finger moves, so each one is a
 * worklet.
 */

/** Where each row starts, the first at 0. Pure. */
export function listSlotTops(heights: readonly number[]): number[] {
  'worklet'
  const tops: number[] = []
  let top = 0
  for (const height of heights) {
    tops.push(top)
    top += height
  }
  return tops
}

/**
 * The slot a dragged row takes with its middle at `centerY`: past every row
 * whose middle it is beyond. Pure.
 */
export function listDragSlot(heights: readonly number[], from: number, centerY: number): number {
  'worklet'
  const tops = listSlotTops(heights)
  let slot = 0
  for (let i = 0; i < heights.length; i++) {
    if (i !== from && tops[i] + heights[i] / 2 < centerY) slot++
  }
  return slot
}

/**
 * How far a row moves aside while another, `draggedHeight` tall, is held over
 * slot `to`: the rows it passed shift toward where it came from. Pure.
 */
export function listRowShift(
  index: number,
  from: number,
  to: number,
  draggedHeight: number,
): number {
  'worklet'
  if (index > from && index <= to) return -draggedHeight
  if (index < from && index >= to) return draggedHeight
  return 0
}

/** How far the dragged row travels from its own slot to sit in slot `to`. Pure. */
export function listSettleOffset(heights: readonly number[], from: number, to: number): number {
  'worklet'
  let offset = 0
  for (let i = from + 1; i <= to; i++) offset += heights[i]
  for (let i = to; i < from; i++) offset -= heights[i]
  return offset
}

/**
 * Where a row moved from slot `from` to slot `to` of the shown list lands:
 * beside the row now in that slot, on the side it came from. Pure.
 */
export function listMoveTarget(
  visibleIds: readonly string[],
  from: number,
  to: number,
): ListDropTarget | undefined {
  if (from === to || from < 0 || to < 0 || from >= visibleIds.length || to >= visibleIds.length) {
    return undefined
  }
  return { id: visibleIds[to], side: to > from ? 'after' : 'before' }
}
