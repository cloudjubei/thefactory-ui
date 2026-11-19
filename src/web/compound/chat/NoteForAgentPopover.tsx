import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

import { VIDEO_MARK_TEXT } from '../../../headless'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export type NoteForAgentPopoverProps = {
  /** What it opens from, which it stays beside. */
  anchorRef: { current: HTMLElement | null }
  /** "Mark 00:13", "Pick 1". */
  title: string
  /** What it is on, beside the title. */
  where: string
  /** Which edge of the anchor it lines up with. */
  align?: 'start' | 'end'
  onCancel: () => void
  onAdd: (note: string) => void
}

const WIDTH_PX = 280
const GAP_PX = 6
const EDGE_PX = 8
/** Room it needs under the flag before it opens above it instead. */
const ROOM_PX = 200

function placeBeside(anchor: HTMLElement, align: 'start' | 'end'): CSSProperties {
  const rect = anchor.getBoundingClientRect()
  const left = Math.max(
    EDGE_PX,
    Math.min(
      align === 'start' ? rect.left : rect.right - WIDTH_PX,
      window.innerWidth - WIDTH_PX - EDGE_PX,
    ),
  )
  return window.innerHeight - rect.bottom >= ROOM_PX
    ? { left, top: rect.bottom + GAP_PX }
    : { left, bottom: window.innerHeight - rect.top + GAP_PX }
}

/**
 * A note for the agent on something marked — a video's moment, a page's element or area: what it
 * is, an optional note, and Add to message. Escape, Cancel or a press outside close it with no
 * note.
 */
export default function NoteForAgentPopover({
  anchorRef,
  title,
  where,
  align = 'end',
  onCancel,
  onAdd,
}: NoteForAgentPopoverProps) {
  const [note, setNote] = useState('')
  const [place, setPlace] = useState<CSSProperties>()
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useLayoutEffect(() => {
    const follow = () => {
      if (anchorRef.current) setPlace(placeBeside(anchorRef.current, align))
    }
    follow()
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [anchorRef, align])

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onCancel()
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [anchorRef, onCancel])

  if (!place) return null
  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-labelledby={titleId}
      className="ui-tooltip flex max-w-[calc(100vw-16px)] flex-col gap-2 p-2.5"
      style={{ position: 'fixed', width: WIDTH_PX, ...place }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onCancel()
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) onAdd(note)
      }}
    >
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span id={titleId} className="text-[13px] font-semibold tabular-nums text-(--text-primary)">
          {title}
        </span>
        <span className="min-w-0 truncate text-[11px] text-(--text-muted)">{where}</span>
      </div>
      <label className="flex flex-col gap-1 text-[11px] text-(--text-secondary)">
        {VIDEO_MARK_TEXT.noteLabel}
        <Textarea
          autoFocus
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-14 resize-none px-2 py-1.5 text-[12px]"
        />
      </label>
      <div className="flex justify-end gap-1.5">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {VIDEO_MARK_TEXT.cancel}
        </Button>
        <Button size="sm" onClick={() => onAdd(note)}>
          {VIDEO_MARK_TEXT.add}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
