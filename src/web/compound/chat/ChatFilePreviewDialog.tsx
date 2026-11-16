import type { SyntheticEvent } from 'react'
import { useChatFilePreview } from '../../../headless/hooks/useChatFilePreview'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import type { ChatFileSourceOf } from '../../../headless/utils/chatFilePreviewTypes'
import FilePreviewDialog from '../files/FilePreviewDialog'
import ChatFileSaveButton from './ChatFileSaveButton'

export type ChatFilePreviewDialogProps = {
  /** The chat file to preview; `null` keeps the dialog closed. */
  path: string | null
  /** Where the chat holds its files. */
  sourceOf: ChatFileSourceOf
  /** A file an agent showed: Save to project sits in the header. */
  saving?: ChatFileSaving
  onClose: () => void
}

/**
 * A file on a message in the document preview, read from the chat's own files
 * — so it opens in a project, group or general chat alike. A file an agent
 * showed offers Save to project in its header.
 */
export default function ChatFilePreviewDialog({
  path,
  sourceOf,
  saving,
  onClose,
}: ChatFilePreviewDialogProps) {
  const preview = useChatFilePreview(path, sourceOf)
  return (
    <span className="contents" onClick={keepInside} onMouseDown={keepInside} onKeyDown={keepInside}>
      <FilePreviewDialog
        state={preview.state}
        onClose={onClose}
        onRetry={preview.reload}
        {...(path && saving
          ? { headerActions: <ChatFileSaveButton source={path} saving={saving} variant="button" /> }
          : {})}
      />
    </span>
  )
}

/** The popup is a portal: what happens in it stays out of the message the chip sits in. */
function keepInside(e: SyntheticEvent) {
  e.stopPropagation()
}
