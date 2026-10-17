import type { ListDropSide, ListDropTarget } from './listReorderTypes'

/** Which side of a row the pointer is on: its top half lands before it, its bottom half after. Pure. */
export function listDropSide(row: { top: number; height: number }, pointerY: number): ListDropSide {
  return pointerY < row.top + row.height / 2 ? 'before' : 'after'
}

/**
 * Where a dragged row lands in the WHOLE list, as a reorder call counts it —
 * taken out, then put back at that index. The list may show only some rows
 * (a status filter) or show them newest first (`reversed`): the row lands
 * right beside the one it was dropped on either way. `undefined` for a drop
 * that moves nothing, or on a row the list does not hold. Pure.
 */
export function listReorderToIndex(
  ids: readonly string[],
  dragId: string,
  target: ListDropTarget,
  options: { reversed?: boolean } = {},
): number | undefined {
  const fromIndex = ids.indexOf(dragId)
  if (fromIndex === -1 || target.id === dragId) return undefined
  const rest = ids.filter((id) => id !== dragId)
  const at = rest.indexOf(target.id)
  if (at === -1) return undefined
  const before = options.reversed ? target.side === 'after' : target.side === 'before'
  const toIndex = before ? at : at + 1
  return toIndex === fromIndex ? undefined : toIndex
}
