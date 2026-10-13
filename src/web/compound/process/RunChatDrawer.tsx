import { useEffect, type ReactNode } from 'react'

import {
  RUN_CHAT_CLOSE_LABEL,
  RUN_CHAT_OPEN_IN_CHAT_LABEL,
  RUN_CHAT_OPENING,
  RUN_CHAT_TITLE,
} from '../../../headless'
import { IconChat, IconClose } from '../../icons'

export type RunChatDrawerProps = {
  /** Moves to the same chat on the Chat screen. Hidden when absent. */
  onOpenInChat?: () => void
  /** The chat itself, rendered by the host; absent while it is being opened. */
  children?: ReactNode
  onClose: () => void
}

/**
 * The run's own chat, in a drawer on the right of the run: the report stays in
 * view beside it, so another item can be discussed or settled while it is open.
 * Its header is slim — the run header beside it already says where the run is.
 */
export default function RunChatDrawer({ onOpenInChat, children, onClose }: RunChatDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside
      aria-label={RUN_CHAT_TITLE}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-(--border-subtle) bg-(--surface-raised) shadow-2xl"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-(--border-subtle) px-3 py-2.5">
        <IconChat className="size-4" />
        <span className="flex-1 text-[14px] font-semibold text-(--text-primary)">
          {RUN_CHAT_TITLE}
        </span>
        {onOpenInChat ? (
          <button
            type="button"
            onClick={onOpenInChat}
            className="rounded px-1.5 py-0.5 text-[12px] text-(--accent-primary) hover:bg-(--surface-hover)"
          >
            {RUN_CHAT_OPEN_IN_CHAT_LABEL}
          </button>
        ) : null}
        <button
          type="button"
          aria-label={RUN_CHAT_CLOSE_LABEL}
          title={RUN_CHAT_CLOSE_LABEL}
          onClick={onClose}
          className="inline-flex size-7 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--surface-hover)"
        >
          <IconClose className="size-3.5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {children ?? (
          <div className="p-4 text-[12.5px] text-(--text-secondary)">{RUN_CHAT_OPENING}</div>
        )}
      </div>
    </aside>
  )
}
