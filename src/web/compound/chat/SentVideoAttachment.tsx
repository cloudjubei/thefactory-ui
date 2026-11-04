import { VIDEO_ATTACHMENT_TEXT, type VideoAttachmentView } from '../../../headless'
import { IconError, IconVideo } from '../../icons'
import VideoCostChip from './VideoCostChip'
import VideoDetailsOpener from './VideoDetailsOpener'
import VideoDetailsPanel from './VideoDetailsPanel'

export type SentVideoAttachmentProps = {
  name: string
  view: VideoAttachmentView
  posterUrl?: string | null
  onOpenSetup?: () => void
}

/**
 * A video sent with a message, as a poster beside the images a message shows.
 * It stays live: the row follows the digest for as long as the chat is open.
 */
export default function SentVideoAttachment({
  name,
  view,
  posterUrl,
  onOpenSetup,
}: SentVideoAttachmentProps) {
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  return (
    <div
      title={name}
      className={[
        'relative flex w-56 max-w-full flex-col overflow-hidden rounded-md border',
        failed
          ? 'border-red-500/60 bg-red-500/10'
          : 'border-(--border-subtle) bg-(--surface-overlay) hover:border-(--border-strong)',
      ].join(' ')}
    >
      <VideoDetailsOpener
        label={VIDEO_ATTACHMENT_TEXT.details(name)}
        details={<VideoDetailsPanel name={name} view={view} />}
        className="cursor-pointer"
      />
      <span className="pointer-events-none relative flex aspect-video w-full items-center justify-center overflow-hidden bg-(--surface-muted) text-(--text-muted)">
        {posterUrl ? (
          <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : failed ? (
          <IconError className="h-7 w-7 text-red-500" />
        ) : (
          <IconVideo className="h-7 w-7" />
        )}
        {view.length ? (
          <span className="absolute left-1 top-1 rounded-xs bg-black/70 px-[3px] text-[10px] leading-[13px] tabular-nums text-white">
            {view.length}
          </span>
        ) : null}
        {preparing && view.line ? (
          <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-1.5 pb-1 pt-2.5 text-[11px] leading-[14px] tabular-nums text-white">
            {view.line}
          </span>
        ) : null}
      </span>
      <span className="pointer-events-none relative flex min-w-0 flex-col gap-0.5 px-2 py-1.5 text-[11px] leading-[15px] text-(--text-secondary)">
        <span className="flex min-w-0 items-baseline gap-1.5 font-medium text-(--text-primary)">
          <span className="truncate">{name}</span>
          {view.size ? (
            <span className="whitespace-nowrap font-normal text-(--text-muted)">{view.size}</span>
          ) : null}
        </span>
        {failed && view.line ? <span className="text-(--text-primary)">{view.line}</span> : null}
        {view.cost ? (
          <span className="pointer-events-auto flex min-w-0">
            <VideoCostChip cost={view.cost} compact />
          </span>
        ) : null}
        {view.transcript ? (
          <span
            className={
              view.transcript.warn ? 'text-(--status-working-soft-fg)' : 'text-(--text-muted)'
            }
          >
            {view.transcript.short}
          </span>
        ) : null}
        {view.canSetUp && onOpenSetup ? (
          <span className="pointer-events-auto">
            <button
              type="button"
              className="text-(--accent-primary) hover:underline"
              onClick={onOpenSetup}
            >
              {VIDEO_ATTACHMENT_TEXT.setUp}
            </button>
          </span>
        ) : null}
      </span>
    </div>
  )
}
