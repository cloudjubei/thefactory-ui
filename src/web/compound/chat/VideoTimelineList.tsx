import {
  VIDEO_TIMELINE_TEXT,
  type VideoTimelineGlyph,
  type VideoTimelineView,
} from '../../../headless'
import { IconPointer, IconSoundLevels, IconSpeech } from '../../icons'

export type VideoTimelineListProps = {
  view: VideoTimelineView
  /** The row the playhead is at, or -1. */
  playheadIndex: number
  onPlayFrom: (atSec: number) => void
  /** Leaves out the caption, where a screen's header says the same. */
  hideCaption?: boolean
}

const CAPTION = 'text-[10px] font-semibold uppercase tracking-wider text-(--text-secondary)'

function Glyph({ glyph }: { glyph: VideoTimelineGlyph }) {
  switch (glyph.kind) {
    case 'still':
      return (
        <img
          src={glyph.url}
          alt=""
          className="h-6 w-10 rounded-xs border border-(--border-subtle) bg-(--surface-muted) object-cover"
        />
      )
    case 'action':
      return <IconPointer className="h-4 w-4 text-(--accent-primary)" />
    case 'speech':
      return <IconSpeech className="h-4 w-4 text-(--status-done-soft-fg)" />
    case 'sound':
      return <IconSoundLevels className="h-4 w-4 text-(--status-working-soft-fg)" />
  }
}

/**
 * A video's timeline in time order: each moment's time plays the video from there, the row at the
 * playhead stands out. While it is being made, or when it failed or holds nothing, one line says so.
 */
export default function VideoTimelineList({
  view,
  playheadIndex,
  onPlayFrom,
  hideCaption = false,
}: VideoTimelineListProps) {
  const caption = hideCaption ? null : (
    <div className="flex items-baseline gap-2 px-2 pb-1">
      <span className={CAPTION}>{VIDEO_TIMELINE_TEXT.caption}</span>
      {view.state === 'rows' ? (
        <span className="text-[11px] text-(--text-muted)">{view.count}</span>
      ) : null}
    </div>
  )
  if (view.state !== 'rows') {
    const line = view.state === 'loading' ? VIDEO_TIMELINE_TEXT.loading : view.line
    return (
      <div className="flex flex-col gap-1">
        {caption}
        <span
          className={[
            'px-2 text-[12px] leading-4 tabular-nums',
            view.state === 'failed' ? 'text-(--text-primary)' : 'text-(--text-muted)',
          ].join(' ')}
        >
          {line}
        </span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-0.5">
      {caption}
      {view.onEveryScreen ? (
        <span className="px-2 pb-1 text-[11px] leading-[15px] text-(--text-muted)">
          {view.onEveryScreen}
        </span>
      ) : null}
      <ol className="flex flex-col gap-0.5">
        {view.rows.map((row, index) => (
          <li
            key={row.key}
            aria-current={index === playheadIndex ? 'time' : undefined}
            className={[
              'flex items-start gap-2 rounded-md px-2 py-1.5',
              index === playheadIndex ? 'bg-(--accent-soft-bg)' : 'hover:bg-(--surface-hover)',
            ].join(' ')}
          >
            <button
              type="button"
              aria-label={VIDEO_TIMELINE_TEXT.playFrom(row.time)}
              className="w-[38px] shrink-0 cursor-pointer text-left text-[11px] leading-4 tabular-nums text-(--accent-primary) hover:underline focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
              onClick={() => onPlayFrom(row.timeSec)}
            >
              {row.time}
            </button>
            <span className="flex h-6 w-10 shrink-0 items-center justify-center">
              <Glyph glyph={row.glyph} />
            </span>
            <div className="min-w-0 flex-1 text-[12px] leading-4 text-(--text-primary)">
              <span className="break-words">{row.text}</span>
              {row.closeUps.map((closeUp) => (
                <span
                  key={closeUp.key}
                  className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-[15px] text-(--text-secondary)"
                >
                  <img
                    src={closeUp.url}
                    alt=""
                    className="h-3.5 w-[26px] shrink-0 rounded-xs border border-(--border-subtle) object-cover"
                  />
                  <span className="min-w-0 break-words">{closeUp.text}</span>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
