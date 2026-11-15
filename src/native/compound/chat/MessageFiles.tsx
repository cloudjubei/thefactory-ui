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
 * the rest as chips. Native mirror of web's `MessageFiles`.
 */
export default function MessageFiles({
  paths,
  align,
  images,
  videoAttachments,
  saving,
}: MessageFilesProps) {
  const save = saving ? { saving } : {}
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
        if (!videoAttachments || !isVideoPath(path)) {
          return <AttachmentFileChip key={key} path={path} {...save} />
        }
        const video = (
          <ChatVideoAttachment
            key={key}
            path={path}
            chat={videoAttachments}
            place="sent"
            fallback={<AttachmentFileChip path={path} />}
          />
        )
        if (!saving) return video
        return (
          <View
            key={key}
            style={{ flexDirection: 'row', alignItems: 'flex-end', gap: nativeSpace[2] }}
          >
            {video}
            <ChatFileSaveButton source={path} saving={saving} variant="icon" />
          </View>
        )
      })}
    </View>
  )
}
