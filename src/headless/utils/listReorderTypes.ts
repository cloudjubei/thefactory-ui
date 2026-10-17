/** Which side of a row a dragged row lands on, as the list shows it. */
export type ListDropSide = 'before' | 'after'

/** Where a dragged row is over: the row under the pointer, and which side of it. */
export interface ListDropTarget {
  id: string
  side: ListDropSide
}
