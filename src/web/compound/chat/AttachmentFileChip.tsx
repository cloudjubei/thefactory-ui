import { attachmentDisplayName } from 'thefactory-tools/utils'
import FileDisplay from '../files/FileDisplay'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import ChatFileSaveButton from './ChatFileSaveButton'

export type AttachmentFileChipProps = {
  path: string
  /** A file an agent showed: offers "Save to project" beside its chip. */
  saving?: ChatFileSaving
}

/** A file on a message, as its chip — with a way to save it when an agent showed it. */
export default function AttachmentFileChip({ path, saving }: AttachmentFileChipProps) {
  const name = attachmentDisplayName(path)
  const chip = (
    <FileDisplay file={{ name, absolutePath: path, relativePath: path }} density="compact" />
  )
  if (!saving) return chip
  return (
    <span className="inline-flex items-center gap-1">
      {chip}
      <ChatFileSaveButton source={path} saving={saving} variant="icon" />
    </span>
  )
}
