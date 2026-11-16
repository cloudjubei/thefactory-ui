import { useMemo, useState } from 'react'
import { attachmentDisplayName } from 'thefactory-tools/utils'

import FileDisplay from '../files/FileDisplay'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import type { ChatFileSourceOf } from '../../../headless/utils/chatFilePreviewTypes'
import ChatFileSaveButton from './ChatFileSaveButton'
import ChatFilePreviewSheet from './ChatFilePreviewSheet'
import type { NativeAttachmentImages } from './chatNativeTypes'

export interface AttachmentFileChipProps {
  path: string
  /** A file an agent showed: offers "Save to project" inside its chip and in its preview. */
  saving?: ChatFileSaving
  /** Where the chat's files are read from: with it, a tap opens the document preview. */
  images?: NativeAttachmentImages
}

/**
 * A file on a message, as its chip. With a way to read the chat's files, a tap
 * opens it in the document preview; when an agent showed it, Save to project
 * sits inside the chip and in the preview's header. Native mirror of web's
 * `AttachmentFileChip`.
 */
export default function AttachmentFileChip({ path, saving, images }: AttachmentFileChipProps) {
  const [open, setOpen] = useState(false)
  const name = attachmentDisplayName(path)
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
      <FileDisplay
        file={{ name, absolutePath: path, relativePath: path }}
        density="compact"
        interactive={sourceOf !== undefined}
        {...(sourceOf ? { onPress: () => setOpen(true), ariaLabel: `Open ${name}` } : {})}
        {...(saving
          ? { trailing: <ChatFileSaveButton source={path} saving={saving} variant="chip" /> }
          : {})}
      />
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
