import { View } from 'react-native'
import { isVideoPath } from 'thefactory-tools/utils'

import { nativeSpace } from '../../../tokens/native'
import { isImageAttachment } from '../../../headless/utils/chatDrop'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import type { ChatVideoAttachments } from '../../../headless/utils/videoAttachmentTypes'
import AttachmentFileChip from './AttachmentFileChip'
import ChatFileSaveButton from './ChatFileSaveButton'
import ChatVideoAttachment from './ChatVideoAttachment'
import SentImageAttachment from './SentImageAttachment'
import type { NativeAttachmentImages } from './chatNativeTypes'

export interface MessageFilesProps {
  paths: readonly string[]
  /** `end` under a person's message, `start` under an agent's reply. */
  align: 'start' | 'end'
  images?: NativeAttachmentImages
  videoAttachments?: ChatVideoAttachments
  /** Files an agent showed: each offers "Save to project". */
  saving?: ChatFileSaving
}

/**
 * The files on a message, under it: images as thumbnails, videos as posters,
 * the rest as chips that open the document preview. Files an agent showed
 * carry Save to project on the thumbnail or poster, and in the preview.
 * Native mirror of web's `MessageFiles`.
 */
export default function MessageFiles({
  paths,
  align,
  images,
  videoAttachments,
  saving,
}: MessageFilesProps) {
  const save = saving ? { saving } : {}
  const read = images ? { images } : {}
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: nativeSpace[2],
        justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
        marginTop: nativeSpace[2],
      }}
    >
      {paths.map((path, i) => {
        const key = `att-${i}-${path}`
        if (images && isImageAttachment(path)) {
          return <SentImageAttachment key={key} path={path} images={images} {...save} />
        }
        const chip = <AttachmentFileChip key={key} path={path} {...save} {...read} />
        if (!videoAttachments || !isVideoPath(path)) return chip
        return (
          <ChatVideoAttachment
            key={key}
            path={path}
            chat={videoAttachments}
            place="sent"
            fallback={chip}
            {...(saving
              ? { actions: <ChatFileSaveButton source={path} saving={saving} variant="overlay" /> }
              : {})}
          />
        )
      })}
    </View>
  )
}
