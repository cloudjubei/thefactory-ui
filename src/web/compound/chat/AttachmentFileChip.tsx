import { useMemo, useState } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'
import FileDisplay from '../files/FileDisplay'
import { chatFileSourceFromPreviewUrl } from '../../../headless/utils/chatFilePreview'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import ChatFileSaveButton from './ChatFileSaveButton'
import ChatFilePreviewDialog from './ChatFilePreviewDialog'

export type AttachmentFileChipProps = {
  path: string
  /** A file an agent showed: offers "Save to project" inside its chip and in its preview. */
  saving?: ChatFileSaving
  /** Where the chat's files are read from: with it, the chip opens the document preview. */
  getPreviewUrl?: (path: string) => Promise<string | null>
}

const revoke = (url: string) => URL.revokeObjectURL(url)

/**
 * A file on a message, as its chip. With a way to read the chat's files, a
 * click opens it in the document preview; when an agent showed it, Save to
 * project sits inside the chip and in the preview's header.
 */
export default function AttachmentFileChip({
  path,
  saving,
  getPreviewUrl,
}: AttachmentFileChipProps) {
  const [open, setOpen] = useState(false)
  const name = attachmentDisplayName(path)
  const sourceOf = useMemo(
    () => (getPreviewUrl ? chatFileSourceFromPreviewUrl(getPreviewUrl, revoke) : undefined),
    [getPreviewUrl],
  )
  return (
    <>
      <FileDisplay
        file={{ name, absolutePath: path, relativePath: path }}
        density="compact"
        interactive={sourceOf !== undefined}
        {...(sourceOf ? { onClick: () => setOpen(true), ariaLabel: `Open ${name}` } : {})}
        {...(saving
          ? { trailing: <ChatFileSaveButton source={path} saving={saving} variant="chip" /> }
          : {})}
      />
      {sourceOf && open ? (
        <ChatFilePreviewDialog
          path={path}
          sourceOf={sourceOf}
          onClose={() => setOpen(false)}
          {...(saving ? { saving } : {})}
        />
      ) : null}
    </>
  )
}
