import { isVideoPath } from 'thefactory-tools/utils'
import { isImageAttachment } from '../../../headless/utils/chatDrop'
import type { ChatFileSaving } from '../../../headless/utils/chatFileSaveTypes'
import type { ChatVideoAttachments } from '../../../headless/utils/videoAttachmentTypes'
import AttachmentFileChip from './AttachmentFileChip'
import ChatFileSaveButton from './ChatFileSaveButton'
import ChatVideoAttachment from './ChatVideoAttachment'
import SentImageAttachment from './SentImageAttachment'

export type MessageFilesProps = {
  paths: readonly string[]
  /** `end` under a person's message, `start` under an agent's reply. */
  align: 'start' | 'end'
  keyPrefix: string
  getPreviewUrl?: (path: string) => Promise<string | null>
  videoAttachments?: ChatVideoAttachments
  /** Files an agent showed: each offers "Save to project". */
  saving?: ChatFileSaving
}

/** The files on a message, under it: images as thumbnails, videos as posters, the rest as chips. */
export default function MessageFiles({
  paths,
  align,
  keyPrefix,
  getPreviewUrl,
  videoAttachments,
  saving,
}: MessageFilesProps) {
  const save = saving ? { saving } : {}
  return (
    <div
      className={[
        'mt-1 flex flex-wrap gap-1',
        align === 'end' ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      {paths.map((path, i) => {
        const key = `${keyPrefix}-att-${i}-${path}`
        if (getPreviewUrl && isImageAttachment(path)) {
          return (
            <SentImageAttachment key={key} path={path} getPreviewUrl={getPreviewUrl} {...save} />
          )
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
          <span key={key} className="inline-flex items-end gap-1">
            {video}
            <ChatFileSaveButton source={path} saving={saving} variant="icon" />
          </span>
        )
      })}
    </div>
  )
}
