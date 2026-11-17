import { useMemo, useState } from 'react'

import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import type { ChatFileSourceOf } from '../../../headless/utils/chatFilePreviewTypes'
import ChatFileChip from './ChatFileChip'
import ChatFilePreviewSheet from './ChatFilePreviewSheet'
import type { NativeAttachmentImages } from './chatNativeTypes'

export interface AttachmentFileChipProps {
  path: string
  /** A file an agent showed: its preview offers "Save to project". */
  saving?: ChatFileSaving
  /** Where the chat's files are read from: with it, a tap opens the document preview. */
  images?: NativeAttachmentImages
}

/**
 * A file on a message, as its chip. With a way to read the chat's files, a tap
 * opens it in the document preview; when an agent showed it, Save to project
 * sits in the preview's header. Native mirror of web's `AttachmentFileChip`.
 */
export default function AttachmentFileChip({ path, saving, images }: AttachmentFileChipProps) {
  const [open, setOpen] = useState(false)
  const sourceOf = useMemo<ChatFileSourceOf | undefined>(() => {
    if (!images) return undefined
    return async (file) => {
      const source = images.sourceOf(file)
      if (!source) return null
      return { url: source.uri, ...(source.headers ? { headers: source.headers } : {}) }
    }
  }, [images])
  return (
    <>
      <ChatFileChip path={path} {...(sourceOf ? { onOpen: () => setOpen(true) } : {})} />
      {sourceOf && open ? (
        <ChatFilePreviewSheet
          path={path}
          sourceOf={sourceOf}
          onClose={() => setOpen(false)}
          {...(saving ? { saving } : {})}
        />
      ) : null}
    </>
  )
}
