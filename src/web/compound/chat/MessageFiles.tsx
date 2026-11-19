import type { VideoMarkedMoment } from 'thefactory-tools/types'
import { isVideoPath } from 'thefactory-tools/utils'
import { withMarkedVideos } from '../../../headless/utils/videoMarks'
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
  /** The moments the message marked: each marked video shows, with its marks under it. */
  videoMarks?: VideoMarkedMoment[]
}

/**
 * The files on a message, under it: images as thumbnails, videos as posters,
 * the rest as chips that open the document preview. Files an agent showed
 * carry Save to project on the thumbnail or poster, and in the preview. A video
 * the message marked shows too, sent with it or before, its marks under it.
 */
export default function MessageFiles({
  paths,
  align,
  keyPrefix,
  getPreviewUrl,
  videoAttachments,
  saving,
  videoMarks,
}: MessageFilesProps) {
  const save = saving ? { saving } : {}
  const read = getPreviewUrl ? { getPreviewUrl } : {}
  return (
    <div
      className={[
        'mt-1 flex flex-wrap gap-1',
        align === 'end' ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      {withMarkedVideos(paths, videoAttachments ? videoMarks : undefined).map((path, i) => {
        const key = `${keyPrefix}-att-${i}-${path}`
        if (getPreviewUrl && isImageAttachment(path)) {
          return (
            <SentImageAttachment key={key} path={path} getPreviewUrl={getPreviewUrl} {...save} />
          )
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
            {...(videoMarks?.length ? { sentMarks: videoMarks } : {})}
            {...(saving
              ? { actions: <ChatFileSaveButton source={path} saving={saving} variant="overlay" /> }
              : {})}
          />
        )
      })}
    </div>
  )
}
