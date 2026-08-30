import type { ReactNode } from 'react'
import {
  GLOBAL_CHAT_RESET_LABEL,
  GLOBAL_CHAT_TITLE,
} from '../../../headless/utils/globalChatConstants'
import { IconPlus } from '../../icons'
import IconButton from '../../primitives/IconButton'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'

export interface GlobalChatOverlayProps {
  isOpen: boolean
  onClose: () => void
  /** The host's own connected chat screen, rendered edge to edge. */
  children: ReactNode
  /** Header title. Defaults to the shared `Assistant` label. */
  title?: string
  /**
   * Archive this conversation and start a new one. Omit to hide the control —
   * e.g. while there is nothing persisted to archive.
   */
  onReset?: () => void
  /** Disables the reset control while an archive is in flight. */
  isResetting?: boolean
  /** Safe-area insets supplied by the host. */
  topInset?: number
  bottomInset?: number
}

/**
 * Host for the app-level assistant chat: a full-screen overlay whose header
 * carries the title, the "new conversation" reset, and the close button. The
 * chat itself is the consumer's — each client passes its own connected screen
 * as `children`, so this shell never duplicates one.
 */
export default function GlobalChatOverlay({
  isOpen,
  onClose,
  children,
  title = GLOBAL_CHAT_TITLE,
  onReset,
  isResetting = false,
  topInset = 0,
  bottomInset = 0,
}: GlobalChatOverlayProps) {
  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      topInset={topInset}
      bottomInset={bottomInset}
      headerActions={
        onReset ? (
          <IconButton
            onPress={onReset}
            disabled={isResetting}
            accessibilityLabel={GLOBAL_CHAT_RESET_LABEL}
          >
            <IconPlus size={18} />
          </IconButton>
        ) : null
      }
    >
      {children}
    </FullScreenOverlay>
  )
}
