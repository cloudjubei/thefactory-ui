import { isVideoPath } from 'thefactory-tools/utils'

import {
  CHAT_UPLOAD_TEXT,
  chatUploadLine,
  formatBytes,
  type ChatAttachmentUpload,
} from '../../../headless'
import InlineStopConfirm from '../chips/InlineStopConfirm'

export type ChatUploadStripProps = {
  uploads: readonly ChatAttachmentUpload[]
  onStop: (id: string) => void
}

function ChatUploadRow({
  upload,
  onStop,
}: {
  upload: ChatAttachmentUpload
  onStop: (id: string) => void
}) {
  const { progress, timeLeft } = chatUploadLine(upload)
  return (
    <div className="flex flex-col gap-1 text-xs text-(--text-secondary)">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="min-w-0 truncate font-medium text-(--text-primary)">{upload.name}</span>
        {upload.sizeBytes !== undefined ? (
          <span className="whitespace-nowrap text-(--text-muted)">
            {formatBytes(upload.sizeBytes)}
          </span>
        ) : null}
        <span className="ml-auto flex shrink-0 items-baseline gap-2.5 tabular-nums">
          <span>{progress}</span>
          {timeLeft ? <span className="text-(--text-muted)">{timeLeft}</span> : null}
          <InlineStopConfirm
            ask={CHAT_UPLOAD_TEXT.stopAsk}
            stop={CHAT_UPLOAD_TEXT.stop}
            keep={CHAT_UPLOAD_TEXT.keep}
            label={CHAT_UPLOAD_TEXT.stopLabel(upload.name)}
            onStop={() => onStop(upload.id)}
          />
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-(--surface-muted)"
        role="progressbar"
        aria-valuenow={upload.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={upload.name}
      >
        <span
          className="block h-full bg-(--accent-primary) transition-[width] duration-150 ease-linear"
          style={{ width: `${upload.percent}%` }}
        />
      </div>
      {isVideoPath(upload.name) ? (
        <div className="text-[11px] leading-[15px] text-(--text-muted)">
          {CHAT_UPLOAD_TEXT.costLater}
        </div>
      ) : null}
    </div>
  )
}

/** The files on their way into a chat, above the composer, each with the time it has left. */
export default function ChatUploadStrip({ uploads, onStop }: ChatUploadStripProps) {
  if (uploads.length === 0) return null
  return (
    <div className="flex max-h-40 flex-col gap-2 overflow-y-auto border-b border-(--border-subtle) bg-(--surface-raised) px-3 py-2">
      {uploads.map((upload) => (
        <ChatUploadRow key={upload.id} upload={upload} onStop={onStop} />
      ))}
    </div>
  )
}
