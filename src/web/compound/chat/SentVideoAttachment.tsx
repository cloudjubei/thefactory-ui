import { useEffect, useRef, useState, type ReactNode } from 'react'

import {
  useVideoPlayback,
  VIDEO_ATTACHMENT_TEXT,
  VIDEO_MARK_TEXT,
  VIDEO_PLAYBACK_TEXT,
  VIDEO_TIMELINE_TEXT,
  videoMarkTimeOf,
  videoPlayerWidthCss,
  videoTimelineRowAt,
  type ChatVideoSource,
  type SentVideoMarkRow,
  type VideoAttachmentView,
  type VideoTimelineView,
} from '../../../headless'
import { formatVideoTime } from 'thefactory-tools/utils'
import { useIsNarrowViewport } from '../../hooks/useIsNarrowViewport'
import {
  IconClose,
  IconError,
  IconFlag,
  IconInfo,
  IconListBullets,
  IconMaximize,
  IconPlay,
  IconVideo,
} from '../../icons'
import ChatVideoPlayer, { type ChatVideoPlayerControl } from './ChatVideoPlayer'
import SentVideoMarks from './SentVideoMarks'
import VideoCostChip from './VideoCostChip'
import VideoDetailsOpener from './VideoDetailsOpener'
import VideoDetailsPanel from './VideoDetailsPanel'
import VideoMarkPopover from './VideoMarkPopover'
import VideoTimelineList from './VideoTimelineList'
import VideoTimelineScreen from './VideoTimelineScreen'

export type SentVideoAttachmentProps = {
  name: string
  view: VideoAttachmentView
  posterUrl?: string | null
  /** Where the video plays from. Left out, the card shows its poster and details only. */
  source?: ChatVideoSource
  onOpenSetup?: () => void
  /** Keeps the controls in view without a hover, for a showcase scene. */
  showControls?: boolean
  /** Buttons always shown in the corner, poster or playing — as Save to project. */
  actions?: ReactNode
  /** The video's timeline as read so far. Given with `onTimelineOpenChange`, the card offers it. */
  timeline?: VideoTimelineView
  timelineOpen?: boolean
  onTimelineOpenChange?: (open: boolean) => void
  /**
   * Given, a playing video offers the flag, which marks the moment it is at for the next message,
   * and each timeline row offers Mark, which marks its own.
   */
  onMark?: (timeSec: number, note: string) => void
  /** The note of the mark already waiting at a moment, which marking it again opens with. */
  markNoteAt?: (timeSec: number) => string | undefined
  /** The moments the message marked on this video, under the card. */
  marks?: SentVideoMarkRow[]
  /** Opens the flag's popover at this moment once the video plays, for a showcase scene. */
  initialMarkSec?: number
  /** Holds the playhead's row at this moment whatever plays, for a showcase scene. */
  fixedPlayheadSec?: number
  /** Opens the note box on the timeline row at this time, for a showcase scene. */
  initialRowMarkSec?: number
  /** Opens the close-up viewer on this close-up of the timeline, for a showcase scene. */
  initialCloseUpIndex?: number
}

const hasNoHover = () => window.matchMedia('(hover: none)').matches

function OverlayButton({
  label,
  onClick,
  children,
  pressed,
  buttonRef,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  /** A button that opens something says whether it is open, and is tinted while it is. */
  pressed?: boolean
  buttonRef?: { current: HTMLButtonElement | null }
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      {...(pressed !== undefined ? { 'aria-expanded': pressed, 'aria-haspopup': 'dialog' } : {})}
      className={[
        'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-white focus-visible:outline-2 focus-visible:outline-white',
        pressed ? 'bg-(--accent-primary)' : 'bg-black/60 hover:bg-black/80',
      ].join(' ')}
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
 * Actions such as Save to project stay in the corner the whole time.
 *
 * Timeline opens the video's digest under the card, or as a screen of its own on a
 * small one; each time plays the video from there. The flag pauses it and marks the
 * moment for the next message; a row's Mark marks its moment the same way. The marks
 * a message carries are rows under the card.
 */
export default function SentVideoAttachment({
  name,
  view,
  posterUrl,
  source,
  onOpenSetup,
  showControls = false,
  actions,
  timeline,
  timelineOpen = false,
  onTimelineOpenChange,
  onMark,
  markNoteAt,
  marks,
  initialMarkSec,
  fixedPlayheadSec,
  initialRowMarkSec,
  initialCloseUpIndex,
}: SentVideoAttachmentProps) {
  const playback = useVideoPlayback(source, view.frame)
  const { state, frame, isOpen, canPlay, play, collapse } = playback
  const narrow = useIsNarrowViewport()
  const [tapped, setTapped] = useState(false)
  const [playheadSec, setPlayheadSec] = useState<number>()
  const [markingSec, setMarkingSec] = useState<number>()
  const fullscreenRef = useRef<(() => void) | null>(null)
  const controlRef = useRef<ChatVideoPlayerControl | null>(null)
  const flagRef = useRef<HTMLButtonElement | null>(null)
  const failed = view.state === 'failed'
  const preparing = view.state === 'preparing'
  const problem = state.failure ? VIDEO_PLAYBACK_TEXT.failure[state.failure] : undefined
  const marking = markingSec !== undefined
  const canMark = !!onMark && isOpen && !!state.source
  const shown = showControls || tapped || marking
  const playhead = fixedPlayheadSec ?? (isOpen ? playheadSec : undefined)
  const playheadIndex =
    playhead !== undefined && timeline?.state === 'rows'
      ? videoTimelineRowAt(timeline.rows, playhead)
      : -1
  const chrome = shown
    ? 'pointer-events-auto opacity-100'
    : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100'

  const pressPoster = () => {
    if (hasNoHover() && !tapped) setTapped(true)
    else play()
  }

  const goFullscreen = () => {
    if (fullscreenRef.current) fullscreenRef.current()
    else play({ fullscreen: true })
  }

  const playFrom = (atSec: number) => {
    setPlayheadSec(atSec)
    if (isOpen && controlRef.current) controlRef.current.seek(atSec)
    else play({ atSec })
  }

  const startMark = () => {
    controlRef.current?.pause()
    setMarkingSec(videoMarkTimeOf(controlRef.current?.time() ?? playheadSec ?? 0))
  }

  const endMark = () => {
    setMarkingSec(undefined)
    flagRef.current?.focus()
  }

  useEffect(() => {
    if (initialMarkSec !== undefined && canMark) setMarkingSec(initialMarkSec)
  }, [initialMarkSec, canMark])

  useEffect(() => {
    if (!isOpen) setMarkingSec(undefined)
  }, [isOpen])

  const fold = timelineOpen && !narrow && timeline
  const wide = isOpen || !!fold
  const listExtras = {
    ...(onMark ? { onMark } : {}),
    ...(markNoteAt ? { markNoteAt } : {}),
    ...(initialRowMarkSec !== undefined ? { initialMarkSec: initialRowMarkSec } : {}),
    ...(initialCloseUpIndex !== undefined ? { initialCloseUpIndex } : {}),
  }

  const card = (
    <div
      style={isOpen && frame ? { width: videoPlayerWidthCss(frame) } : undefined}
      className={[
        'group relative flex max-w-full flex-col overflow-hidden rounded-md border transition-[width] duration-200',
        isOpen && frame ? '' : wide ? 'w-105' : 'w-56',
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
              controlRef={controlRef}
              onTime={setPlayheadSec}
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
        {canPlay || actions ? (
          <span className="pointer-events-none absolute right-1 top-1 flex gap-1">
            {canPlay ? (
              <span className={`flex gap-1 ${chrome}`}>
                {canMark ? (
                  <OverlayButton
                    label={VIDEO_MARK_TEXT.flag(name)}
                    onClick={marking ? endMark : startMark}
                    pressed={marking}
                    buttonRef={flagRef}
                  >
                    <IconFlag className="h-[15px] w-[15px]" />
                  </OverlayButton>
                ) : null}
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
            {actions ? <span className="pointer-events-auto flex gap-1">{actions}</span> : null}
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
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {onTimelineOpenChange ? (
              <button
                type="button"
                aria-pressed={timelineOpen}
                aria-label={VIDEO_TIMELINE_TEXT.toggleLabel(name)}
                className={[
                  'inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border px-1.5 text-[10px] font-medium focus-visible:outline-2 focus-visible:outline-(--accent-primary)',
                  timelineOpen
                    ? 'border-(--accent-soft-border) bg-(--accent-soft-bg) text-(--accent-soft-fg)'
                    : 'border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:text-(--text-primary)',
                ].join(' ')}
                onClick={() => onTimelineOpenChange(!timelineOpen)}
              >
                <IconListBullets className="h-2.5 w-2.5" />
                {VIDEO_TIMELINE_TEXT.toggle}
              </button>
            ) : null}
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
      {fold ? (
        <div className="max-h-[300px] overflow-y-auto border-t border-(--border-subtle) px-1 pt-2 pb-1.5">
          <VideoTimelineList
            view={fold}
            playheadIndex={playheadIndex}
            onPlayFrom={playFrom}
            {...listExtras}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <>
      {marks?.length ? (
        <div className="flex max-w-full flex-col items-end">
          <div className="flex w-fit max-w-full flex-col gap-1">
            {card}
            <SentVideoMarks name={name} rows={marks} onPlay={playFrom} />
          </div>
        </div>
      ) : (
        card
      )}
      {timeline && onTimelineOpenChange && narrow ? (
        <VideoTimelineScreen
          isOpen={timelineOpen}
          name={name}
          view={timeline}
          playheadIndex={playheadIndex}
          onBack={() => onTimelineOpenChange(false)}
          onPlayFrom={(atSec) => {
            onTimelineOpenChange(false)
            playFrom(atSec)
          }}
          {...listExtras}
        />
      ) : null}
      {marking && onMark ? (
        <VideoMarkPopover
          anchorRef={flagRef}
          time={formatVideoTime(markingSec)}
          note={markNoteAt?.(markingSec)}
          onCancel={endMark}
          onAdd={(note) => {
            onMark(markingSec, note)
            endMark()
          }}
        />
      ) : null}
    </>
  )
}
