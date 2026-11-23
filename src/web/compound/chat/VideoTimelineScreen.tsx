import { VIDEO_TIMELINE_TEXT, type VideoTimelineView } from '../../../headless'
import { IconChevronLeft } from '../../icons'
import { FullScreenOverlay } from '../../primitives/FullScreenOverlay'
import VideoTimelineList, { type VideoTimelineListProps } from './VideoTimelineList'

export type VideoTimelineScreenProps = Pick<
  VideoTimelineListProps,
  'onMark' | 'markNoteAt' | 'initialMarkSec' | 'initialCloseUpIndex'
> & {
  isOpen: boolean
  name: string
  view: VideoTimelineView
  playheadIndex: number
  onBack: () => void
  /** A time pressed: back to the chat, where the video plays from there. */
  onPlayFrom: (atSec: number) => void
}

/** A video's timeline as a screen of its own, over the chat: a small screen's in place of the fold. */
export default function VideoTimelineScreen({
  isOpen,
  name,
  view,
  playheadIndex,
  onBack,
  onPlayFrom,
  ...list
}: VideoTimelineScreenProps) {
  return (
    <FullScreenOverlay isOpen={isOpen} onClose={onBack} hideHeader>
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-(--border-subtle) px-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-0.5 rounded-md px-1 text-[15px] text-(--accent-primary) focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
        >
          <IconChevronLeft className="h-[18px] w-[18px]" />
          {VIDEO_TIMELINE_TEXT.back}
        </button>
        <span className="min-w-0 truncate text-[15px] font-semibold text-(--text-primary)">
          {name}
        </span>
        {view.state === 'rows' ? (
          <span className="shrink-0 text-[12px] text-(--text-muted)">{view.count}</span>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        <VideoTimelineList
          view={view}
          playheadIndex={playheadIndex}
          onPlayFrom={onPlayFrom}
          hideCaption
          {...list}
        />
      </div>
    </FullScreenOverlay>
  )
}
