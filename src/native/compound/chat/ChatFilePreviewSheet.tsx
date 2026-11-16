import { useChatFilePreview } from '../../../headless/hooks/useChatFilePreview'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import type { ChatFileSourceOf } from '../../../headless/utils/chatFilePreviewTypes'
import FilePreviewSheet from '../files/FilePreviewSheet'
import ChatFileSaveButton from './ChatFileSaveButton'

export interface ChatFilePreviewSheetProps {
  /** The chat file to preview; `null` keeps the sheet closed. */
  path: string | null
  /** Where the chat holds its files. */
  sourceOf: ChatFileSourceOf
  /** A file an agent showed: Save to project sits in the header. */
  saving?: ChatFileSaving
  onClose: () => void
}

/**
 * Native peer of web's `ChatFilePreviewDialog`: a file on a message in the
 * full-screen document preview, read from the chat's own files. A file an
 * agent showed offers Save to project in its header.
 */
export default function ChatFilePreviewSheet({
  path,
  sourceOf,
  saving,
  onClose,
}: ChatFilePreviewSheetProps) {
  const preview = useChatFilePreview(path, sourceOf)
  return (
    <FilePreviewSheet
      state={preview.state}
      onClose={onClose}
      onRetry={preview.reload}
      {...(path && saving
        ? { headerActions: <ChatFileSaveButton source={path} saving={saving} variant="button" /> }
        : {})}
    />
  )
}
