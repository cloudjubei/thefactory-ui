import {
  CHAT_UPLOAD_TEXT,
  VIDEO_ATTACHMENT_TEXT,
  type VideoAttachmentView,
} from '../../../headless'
import { IconError, IconVideo } from '../../icons'
import Spinner from '../../primitives/Spinner'
import VideoCostChip from './VideoCostChip'
import VideoDetailsOpener from './VideoDetailsOpener'
import VideoDetailsPanel from './VideoDetailsPanel'

export type VideoAttachmentCardProps = {
  name: string
  view: VideoAttachmentView
  posterUrl?: string | null
  onRemove?: () => void
  onOpenSetup?: () => void
  onRetry?: () => void
}

const LINK = 'text-(--accent-primary) hover:underline whitespace-nowrap'

/** A video in the composer: its poster, length and how it stands, with what it will cost. */
export default function VideoAttachmentCard({
  name,
  view,
  posterUrl,
  onRemove,
  onOpenSetup,
  onRetry,
}: VideoAttachmentCardProps) {
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  const showSetup = view.canSetUp && !!onOpenSetup
  return (
    <div
      title={name}
      className={[
        '@container relative flex w-[392px] max-w-full gap-2 overflow-hidden rounded-md border p-1.5 pr-6.5',
        failed
          ? 'border-red-500/60 bg-red-500/10'
          : 'border-(--border-subtle) bg-(--surface-overlay)',
      ].join(' ')}
    >
      <VideoDetailsOpener
        label={VIDEO_ATTACHMENT_TEXT.details(name)}
        details={<VideoDetailsPanel name={name} view={view} />}
        className="cursor-pointer hover:bg-(--surface-hover)"
      />
      <span className="pointer-events-none relative flex h-11 w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-sm bg-(--surface-muted) text-(--text-muted)">
        {posterUrl ? (
          <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <IconVideo className="h-5 w-5" />
        )}
        {view.length ? (
          <span className="absolute bottom-0.5 right-0.5 rounded-xs bg-black/70 px-[3px] text-[10px] leading-[13px] tabular-nums text-white">
            {view.length}
          </span>
        ) : null}
      </span>
      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5 text-[11px] leading-[15px] text-(--text-secondary)">
        <span className="flex min-w-0 items-baseline gap-1.5 text-xs font-medium leading-4 text-(--text-primary)">
          <span className="truncate">{name}</span>
          {view.size ? (
            <span className="whitespace-nowrap text-[11px] font-normal text-(--text-muted)">
              {view.size}
            </span>
          ) : null}
        </span>
        {view.line ? (
          <span className="flex min-w-0 items-start gap-1 tabular-nums text-(--text-primary)">
            {preparing ? (
              <span className="mt-[3px] shrink-0">
                <Spinner size={10} />
              </span>
            ) : null}
            {failed ? <IconError className="mt-px h-3 w-3 shrink-0 text-red-500" /> : null}
            <span className="min-w-0">{view.line}</span>
          </span>
        ) : null}
        {view.cost ? (
          <>
            <span className="pointer-events-auto hidden min-w-0 @min-[340px]:flex">
              <VideoCostChip cost={view.cost} />
            </span>
            <span className="pointer-events-auto flex min-w-0 @min-[340px]:hidden">
              <VideoCostChip cost={view.cost} compact />
            </span>
          </>
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
        {showSetup || onRetry ? (
          <span className="pointer-events-auto flex gap-2.5">
            {showSetup ? (
              <button type="button" className={LINK} onClick={onOpenSetup}>
                {VIDEO_ATTACHMENT_TEXT.setUp}
              </button>
            ) : null}
            {onRetry ? (
              <button type="button" className={LINK} onClick={onRetry}>
                {CHAT_UPLOAD_TEXT.retry}
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center text-[13px] leading-none opacity-60 hover:opacity-100"
          onClick={onRemove}
          aria-label={VIDEO_ATTACHMENT_TEXT.remove(name)}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
