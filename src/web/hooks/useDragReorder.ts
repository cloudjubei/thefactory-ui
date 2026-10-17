import { useCallback, useRef, useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'

import { listDropSide, listReorderToIndex } from '../../headless/utils/listReorder'
import type { ListDropTarget } from '../../headless/utils/listReorderTypes'

/** A control inside a draggable row that must keep its own clicks and drags. */
const NO_DRAG_SELECTOR = '.no-drag'

/** What {@link useDragReorder} is handed. */
export interface DragReorderOptions {
  /** Every row's id, in the list's real order — shown or not. */
  ids: readonly string[]
  /** Whether rows can be dragged now: off while searching, sorted otherwise, or saving. */
  enabled: boolean
  /** The list shows the real order back to front. */
  reversed?: boolean
  /** Move `id` to `toIndex` of the real order. */
  onMove: (id: string, toIndex: number) => Promise<void>
}

/** Props a draggable row spreads onto its element. */
export interface DragReorderRowProps {
  draggable: boolean
  onMouseDown: (e: MouseEvent<HTMLElement>) => void
  onDragStart: (e: DragEvent<HTMLElement>) => void
  onDragOver: (e: DragEvent<HTMLElement>) => void
  onDrop: (e: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}

/** What a list wired for dragging reads back. */
export interface DragReorder {
  /** The props a row with this id spreads. */
  rowProps: (id: string) => DragReorderRowProps
  /** The row being dragged, if one is. */
  draggingId: string | undefined
  /** Where the dragged row would land, when the pointer is over a row it can land beside. */
  target: ListDropTarget | undefined
  /** A move is being saved. */
  saving: boolean
}

/**
 * Drag a list's rows to reorder them: a row is picked up anywhere but on a
 * `.no-drag` control, shows where it would land beside the row under the
 * pointer, and is moved there in the list's real order on drop — beside that
 * row even when the list hides rows between (see `listReorderToIndex`).
 */
export function useDragReorder(options: DragReorderOptions): DragReorder {
  const { ids, enabled, reversed, onMove } = options
  const [draggingId, setDraggingId] = useState<string | undefined>()
  const [target, setTarget] = useState<ListDropTarget | undefined>()
  const [saving, setSaving] = useState(false)
  const fromNoDrag = useRef(false)

  const reset = useCallback(() => {
    setDraggingId(undefined)
    setTarget(undefined)
    fromNoDrag.current = false
  }, [])

  const drop = useCallback(async () => {
    const dragged = draggingId
    const over = target
    reset()
    if (!dragged || !over) return
    const toIndex = listReorderToIndex(ids, dragged, over, { reversed })
    if (toIndex === undefined) return
    setSaving(true)
    try {
      await onMove(dragged, toIndex)
    } finally {
      setSaving(false)
    }
  }, [draggingId, target, ids, reversed, onMove, reset])

  const rowProps = useCallback(
    (id: string): DragReorderRowProps => ({
      draggable: enabled && !saving,
      onMouseDown: (e) => {
        fromNoDrag.current = !!(e.target as HTMLElement | null)?.closest(NO_DRAG_SELECTOR)
      },
      onDragStart: (e) => {
        if (!enabled || saving || fromNoDrag.current) {
          e.preventDefault()
          return
        }
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', id)
        setDraggingId(id)
      },
      onDragOver: (e) => {
        if (!draggingId) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const rect = e.currentTarget.getBoundingClientRect()
        const side = listDropSide(rect, e.clientY)
        const moves = listReorderToIndex(ids, draggingId, { id, side }, { reversed }) !== undefined
        setTarget(moves ? { id, side } : undefined)
      },
      onDrop: (e) => {
        if (!draggingId) return
        e.preventDefault()
        void drop()
      },
      onDragEnd: reset,
    }),
    [enabled, saving, draggingId, ids, reversed, drop, reset],
  )

  return { rowProps, draggingId, target, saving }
}
