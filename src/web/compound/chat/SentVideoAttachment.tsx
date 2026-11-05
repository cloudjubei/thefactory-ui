import { useRef, useState, type ReactNode } from 'react'

import {
  useVideoPlayback,
  VIDEO_ATTACHMENT_TEXT,
  VIDEO_PLAYBACK_TEXT,
  videoPlayerWidthCss,
  type ChatVideoSource,
  type VideoAttachmentView,
} from '../../../headless'
import { IconClose, IconError, IconInfo, IconMaximize, IconPlay, IconVideo } from '../../icons'
import ChatVideoPlayer from './ChatVideoPlayer'
import VideoCostChip from './VideoCostChip'
import VideoDetailsOpener from './VideoDetailsOpener'
import VideoDetailsPanel from './VideoDetailsPanel'

export type SentVideoAttachmentProps = {
  name: string
  view: VideoAttachmentView
  posterUrl?: string | null
  /** Where the video plays from. Left out, the card shows its poster and details only. */
  source?: ChatVideoSource
  onOpenSetup?: () => void
  /** Keeps the controls in view without a hover, for a showcase scene. */
  showControls?: boolean
}

const hasNoHover = () => window.matchMedia('(hover: none)').matches

function OverlayButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/**
 * A video sent with a message. It stays live: the row follows the digest for as
 * long as the chat is open. It plays in the card, which grows to the video's own
 * shape and goes back on collapse. Play and full screen show on hover or keyboard
 * focus, and after a tap where there is no hover; details stay on the info button.
 */
export default function SentVideoAttachment({
  name,
  view,
  posterUrl,
  source,
  onOpenSetup,
  showControls = false,
}: SentVideoAttachmentProps) {
  const playback = useVideoPlayback(source, view.frame)
  const { state, frame, isOpen, canPlay, play, collapse } = playback
  const [tapped, setTapped] = useState(false)
  const fullscreenRef = useRef<(() => void) | null>(null)
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  const problem = state.failure ? VIDEO_PLAYBACK_TEXT.failure[state.failure] : undefined
  const shown = showControls || tapped
  const chrome = shown
    ? 'opacity-100'
    : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100'

  const pressPoster = () => {
    if (hasNoHover() && !tapped) setTapped(true)
    else play()
  }

  const goFullscreen = () => {
    if (fullscreenRef.current) fullscreenRef.current()
    else play({ fullscreen: true })
  }

  return (
    <div
      style={isOpen && frame ? { width: videoPlayerWidthCss(frame) } : undefined}
      className={[
        'group relative flex max-w-full flex-col overflow-hidden rounded-md border transition-[width] duration-200',
        isOpen && frame ? '' : isOpen ? 'w-105' : 'w-56',
        failed
          ? 'border-red-500/60 bg-red-500/10'
          : 'border-(--border-subtle) bg-(--surface-overlay) hover:border-(--border-strong)',
      ].join(' ')}
    >
      <div
        style={{ aspectRatio: isOpen && frame ? frame.width / frame.height : 16 / 9 }}
        className={[
          'relative flex w-full items-center justify-center overflow-hidden text-(--text-muted)',
          isOpen ? 'bg-black' : 'bg-(--surface-muted)',
        ].join(' ')}
      >
        {isOpen ? (
          state.source ? (
            <ChatVideoPlayer
              playback={playback}
              posterUrl={posterUrl}
              fullscreenRef={fullscreenRef}
            />
          ) : null
        ) : (
          <>
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
            {canPlay ? (
              <>
                <button
                  type="button"
                  aria-label={VIDEO_PLAYBACK_TEXT.play(name)}
                  className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--accent-primary)"
                  onClick={pressPoster}
                />
                <span
                  className={`pointer-events-none absolute flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white ${shown ? '' : 'opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100'}`}
                >
                  <IconPlay className="h-5 w-5 [&_polygon]:fill-white" />
                </span>
              </>
            ) : null}
            {problem ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/75 px-1.5 py-1 text-[11px] leading-[14px] text-white">
                {problem}
              </span>
            ) : preparing && view.line ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-1.5 pb-1 pt-2.5 text-[11px] leading-[14px] tabular-nums text-white">
                {view.line}
              </span>
            ) : null}
          </>
        )}
        {canPlay ? (
          <span className={`absolute right-1 top-1 flex gap-1 ${chrome}`}>
            <OverlayButton label={VIDEO_PLAYBACK_TEXT.fullScreen(name)} onClick={goFullscreen}>
              <IconMaximize className="h-4 w-4 [&_polyline]:stroke-white" />
            </OverlayButton>
            {isOpen ? (
              <OverlayButton label={VIDEO_PLAYBACK_TEXT.collapse(name)} onClick={collapse}>
                <IconClose className="h-4 w-4" />
              </OverlayButton>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-2 py-1.5 text-[11px] leading-[15px] text-(--text-secondary)">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-(--text-primary)">
          <span title={name} className="truncate">
            {name}
          </span>
          {view.size ? (
            <span className="whitespace-nowrap font-normal text-(--text-muted)">{view.size}</span>
          ) : null}
          <span className="ml-auto flex shrink-0">
            <VideoDetailsOpener
              label={VIDEO_ATTACHMENT_TEXT.details(name)}
              details={<VideoDetailsPanel name={name} view={view} />}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-xs text-(--text-muted) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
            >
              <IconInfo className="h-3.5 w-3.5" />
            </VideoDetailsOpener>
          </span>
        </span>
        {failed && view.line ? <span className="text-(--text-primary)">{view.line}</span> : null}
        {view.cost ? (
          <span className="flex min-w-0">
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
          <span>
            <button
              type="button"
              className="text-(--accent-primary) hover:underline"
              onClick={onOpenSetup}
            >
              {VIDEO_ATTACHMENT_TEXT.setUp}
            </button>
          </span>
        ) : null}
      </div>
    </div>
  )
}
