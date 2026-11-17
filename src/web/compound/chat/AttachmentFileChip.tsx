import { useMemo, useState } from 'react'
import { chatFileSourceFromPreviewUrl } from '../../../headless/utils/chatFilePreview'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import ChatFileChip from './ChatFileChip'
import ChatFilePreviewDialog from './ChatFilePreviewDialog'

export type AttachmentFileChipProps = {
  path: string
  /** A file an agent showed: its preview offers "Save to project". */
  saving?: ChatFileSaving
  /** Where the chat's files are read from: with it, the chip opens the document preview. */
  getPreviewUrl?: (path: string) => Promise<string | null>
}

const revoke = (url: string) => URL.revokeObjectURL(url)

/**
 * A file on a message, as its chip. With a way to read the chat's files, a
 * click opens it in the document preview; when an agent showed it, Save to
 * project sits in the preview's header.
 */
export default function AttachmentFileChip({
  path,
  saving,
  getPreviewUrl,
}: AttachmentFileChipProps) {
  const [open, setOpen] = useState(false)
  const sourceOf = useMemo(
    () => (getPreviewUrl ? chatFileSourceFromPreviewUrl(getPreviewUrl, revoke) : undefined),
    [getPreviewUrl],
  )
  return (
    <>
      <ChatFileChip path={path} {...(sourceOf ? { onOpen: () => setOpen(true) } : {})} />
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
