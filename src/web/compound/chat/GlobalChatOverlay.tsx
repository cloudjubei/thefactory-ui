import type { ReactNode } from 'react'
import {
  GLOBAL_CHAT_RESET_LABEL,
  GLOBAL_CHAT_TITLE,
} from '../../../headless/utils/globalChatConstants'
import { IconPlus } from '../../icons'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'

export type GlobalChatOverlayProps = {
  isOpen: boolean
  onClose: () => void
  /** The host's own connected chat body, rendered edge to edge. */
  children: ReactNode
  /** Header title. Defaults to the shared `Assistant` label. */
  title?: string
  /**
   * Archive this conversation and start a new one. Omit to hide the control —
   * e.g. while there is nothing persisted to archive.
   */
  onReset?: () => void
  /** Greys the reset control while an archive is in flight. */
  isResetting?: boolean
}

/**
 * Host for the app-level assistant chat: a full-screen overlay whose header
 * carries the title, the "new conversation" reset, and the close button. The
 * chat itself is the consumer's — each client passes its own connected body as
 * `children`, so this shell never duplicates one.
 */
export default function GlobalChatOverlay({
  isOpen,
  onClose,
  children,
  title = GLOBAL_CHAT_TITLE,
  onReset,
  isResetting = false,
}: GlobalChatOverlayProps) {
  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      headerActions={
        onReset ? (
          <button
            type="button"
            onClick={onReset}
            disabled={isResetting}
            aria-label={GLOBAL_CHAT_RESET_LABEL}
            title={GLOBAL_CHAT_RESET_LABEL}
            className="inline-flex items-center justify-center w-8 h-8 rounded border border-(--border-subtle) bg-(--surface-overlay) text-(--text-secondary) hover:bg-(--surface-hover) disabled:opacity-50 disabled:pointer-events-none"
          >
            <IconPlus className="w-4 h-4" />
          </button>
        ) : null
      }
    >
      {children}
    </FullScreenOverlay>
  )
}
