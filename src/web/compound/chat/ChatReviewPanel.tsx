import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

import { chatReviewPanelWidth } from '../../../headless/utils/chatChangesDock'
import {
  CHAT_CHANGES_DOCK_COPY,
  CHAT_REVIEW_PANEL_DEFAULT_WIDTH,
} from '../../../headless/utils/chatChangesDockConstants'
import type {
  ChatReviewHeaderView,
  ChatReviewLayout,
} from '../../../headless/utils/chatChangesDockTypes'
import { IconChevronLeft, IconClose } from '../../icons'
import { RefChip } from '../chips'
import { ResizeHandle } from '../ResizeHandle'

export type ChatReviewPanelProps = {
  /** Beside the chat, or over it on a narrow one. */
  layout: ChatReviewLayout
  header: ChatReviewHeaderView
  /** The chat's whole width — what the panel leaves the chat its own room against. */
  chatWidth?: number
  onClose: () => void
  /** The review itself. */
  children: ReactNode
}

/**
 * Where a turn's full review opens: a panel beside the chat, dragged wider or
 * narrower at its edge, or — on a narrow chat — a sheet over it with the way
 * back to the chat. Its head says what it holds and the branch it waits on.
 */
export function ChatReviewPanel({
  layout,
  header,
  chatWidth,
  onClose,
  children,
}: ChatReviewPanelProps) {
  const [width, setWidth] = useState(CHAT_REVIEW_PANEL_DEFAULT_WIDTH)
  const [shown, setShown] = useState(false)
  const dragRef = useRef<{ move: (e: globalThis.PointerEvent) => void; end: () => void } | null>(
    null,
  )

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(
    () => () => {
      const drag = dragRef.current
      if (!drag) return
      window.removeEventListener('pointermove', drag.move)
      window.removeEventListener('pointerup', drag.end)
    },
    [],
  )

  const shownWidth = chatReviewPanelWidth(width, chatWidth ?? Number.POSITIVE_INFINITY)

  const onResizeStart = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = shownWidth
    const move = (ev: globalThis.PointerEvent) => setWidth(startWidth - (ev.clientX - startX))
    const end = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
    }
    dragRef.current = { move, end }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  const branch = header.branch ? <RefChip kind="branch" value={header.branch} /> : null
  const body = <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

  if (layout === 'sheet') {
    return (
      <div
        role="dialog"
        aria-label={header.title}
        className={`absolute inset-0 z-30 flex flex-col bg-(--surface-base) shadow-xl transition-transform duration-200 ease-out ${
          shown ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center gap-1.5 border-b border-(--border-subtle) px-2 py-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-[14px] text-(--accent-primary) hover:bg-(--surface-hover) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
          >
            <IconChevronLeft className="h-4 w-4" />
            {CHAT_CHANGES_DOCK_COPY.backToChat}
          </button>
          <span className="min-w-0 truncate text-[14px] font-semibold text-(--text-primary)">
            {header.title}
          </span>
          {branch ? <span className="ml-auto min-w-0 shrink truncate">{branch}</span> : null}
        </div>
        {body}
      </div>
    )
  }

  return (
    <aside
      aria-label={header.title}
      className="relative flex h-full shrink-0 flex-col border-l border-(--border-default) bg-(--surface-base)"
      style={{ width: shownWidth }}
    >
      <ResizeHandle
        orientation="vertical"
        className="absolute bottom-0 left-0 top-0 z-10"
        hitBoxSize={12}
        hideLine
        onResizeStart={onResizeStart}
      />
      <div className="flex shrink-0 items-center gap-2 border-b border-(--border-subtle) px-4 py-2.5">
        <span className="min-w-0 truncate text-[14px] font-semibold text-(--text-primary)">
          {header.title}
        </span>
        {branch}
        <button
          type="button"
          onClick={onClose}
          aria-label={CHAT_CHANGES_DOCK_COPY.close}
          title={CHAT_CHANGES_DOCK_COPY.close}
          className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
        >
          <IconClose className="h-3.5 w-3.5" />
        </button>
      </div>
      {body}
    </aside>
  )
}
