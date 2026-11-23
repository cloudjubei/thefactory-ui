import { useEffect, useMemo, useRef, useState } from 'react'

import {
  VIDEO_MARK_TEXT,
  VIDEO_TIMELINE_TEXT,
  videoTimelineCloseUps,
  type VideoTimelineGlyph,
  type VideoTimelineMarkLine,
  type VideoTimelineRow,
  type VideoTimelineView,
} from '../../../headless'
import { IconFlag, IconPointer, IconSoundLevels, IconSpeech } from '../../icons'
import VideoCloseUpViewer from './VideoCloseUpViewer'
import VideoMarkPopover from './VideoMarkPopover'

export type VideoTimelineListProps = {
  view: VideoTimelineView
  /** The row the playhead is at, or -1. */
  playheadIndex: number
  onPlayFrom: (atSec: number) => void
  /** Leaves out the caption, where a screen's header says the same. */
  hideCaption?: boolean
  /** Given, each row offers Mark, which puts its moment in the composer with an optional note. */
  onMark?: (timeSec: number, note: string) => void
  /** The note of the mark already waiting at a moment, which Mark opens with. */
  markNoteAt?: (timeSec: number) => string | undefined
  /** Opens the note box on the row at this time, for a showcase scene. */
  initialMarkSec?: number
  /** Opens the viewer on this close-up, by its place among them all, for a showcase scene. */
  initialCloseUpIndex?: number
}

/** Where a row's text starts: past its padding, time and glyph, so the lines under it line up. */
const UNDER_TEXT = 'pl-[102px] pr-2'

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

function MarkLine({ mark }: { mark: VideoTimelineMarkLine }) {
  return (
    <li className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-[15px]">
      <IconFlag className="h-2.5 w-2.5 shrink-0 self-center text-(--accent-primary)" />
      <span className="shrink-0 tabular-nums text-(--accent-primary)">{mark.time}</span>
      <span
        className={[
          'min-w-0 break-words',
          mark.hasNote ? 'text-(--text-secondary)' : 'italic text-(--text-muted)',
        ].join(' ')}
      >
        {mark.note}
      </span>
      <span
        className={[
          'shrink-0 rounded-full border px-1.5 text-[9.5px] font-medium leading-[14px]',
          mark.source === 'composer'
            ? 'border-(--accent-soft-border) bg-(--accent-soft-bg) text-(--accent-soft-fg)'
            : 'border-(--border-default) text-(--text-muted)',
        ].join(' ')}
      >
        {mark.tag}
      </span>
    </li>
  )
}

/**
 * A video's timeline in time order: each moment's time plays the video from there, the row at the
 * playhead stands out. While it is being made, or when it failed or holds nothing, one line says so.
 * Given `onMark`, a row shows Mark on hover or focus, which opens the flag's note box under it.
 * Each close-up opens at its real size in a viewer that steps through them all. The person's marks
 * are lines under the rows they fall in, sent or waiting in the composer.
 */
export default function VideoTimelineList({
  view,
  playheadIndex,
  onPlayFrom,
  hideCaption = false,
  onMark,
  markNoteAt,
  initialMarkSec,
  initialCloseUpIndex,
}: VideoTimelineListProps) {
  const [marking, setMarking] = useState<VideoTimelineRow>()
  const [viewing, setViewing] = useState<number | undefined>(initialCloseUpIndex)
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const markAnchorRef = useRef<HTMLElement | null>(null)
  markAnchorRef.current = marking ? (rowRefs.current[marking.key] ?? null) : null
  const closeUps = useMemo(() => videoTimelineCloseUps(view), [view])
  const rows = view.state === 'rows' ? view.rows : undefined

  useEffect(() => {
    if (initialMarkSec === undefined || !onMark) return
    const row = rows?.find((one) => one.timeSec === initialMarkSec)
    if (row) setMarking(row)
  }, [initialMarkSec, onMark, rows])

  const endMark = () => {
    const key = marking?.key
    setMarking(undefined)
    if (key) pillRefs.current[key]?.focus()
  }

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
            ref={(element) => {
              rowRefs.current[row.key] = element
            }}
            aria-current={index === playheadIndex ? 'time' : undefined}
            className={[
              'group/row relative rounded-md',
              index === playheadIndex ? 'bg-(--accent-soft-bg)' : 'hover:bg-(--surface-hover)',
            ].join(' ')}
          >
            <button
              type="button"
              title={VIDEO_TIMELINE_TEXT.playFrom(row.time)}
              className={[
                'flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-(--accent-primary)',
                onMark ? 'pr-16' : '',
              ].join(' ')}
              onClick={() => onPlayFrom(row.timeSec)}
            >
              <span className="w-[38px] shrink-0 text-[11px] leading-4 tabular-nums text-(--accent-primary)">
                {row.time}
              </span>
              <span className="flex h-6 w-10 shrink-0 items-center justify-center">
                <Glyph glyph={row.glyph} />
              </span>
              <span className="min-w-0 flex-1 break-words text-[12px] leading-4 text-(--text-primary)">
                {row.text}
              </span>
            </button>
            {row.closeUps.length ? (
              <span className={`-mt-1 flex flex-col items-start gap-0.5 pb-1.5 ${UNDER_TEXT}`}>
                {row.closeUps.map((closeUp) => (
                  <button
                    key={closeUp.key}
                    type="button"
                    title={VIDEO_TIMELINE_TEXT.openCloseUp(closeUp.time)}
                    className="flex cursor-zoom-in items-center gap-1.5 rounded-xs text-left text-[11px] leading-[15px] text-(--text-secondary) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--accent-primary)"
                    onClick={() => setViewing(closeUps.indexOf(closeUp))}
                  >
                    <img
                      src={closeUp.url}
                      alt=""
                      className="h-3.5 w-[26px] shrink-0 rounded-xs border border-(--border-subtle) object-cover"
                    />
                    <span className="min-w-0 break-words">{closeUp.text}</span>
                  </button>
                ))}
              </span>
            ) : null}
            {row.marks.length ? (
              <ul className={`-mt-0.5 flex flex-col gap-0.5 pb-1.5 ${UNDER_TEXT}`}>
                {row.marks.map((mark) => (
                  <MarkLine key={mark.key} mark={mark} />
                ))}
              </ul>
            ) : null}
            {onMark ? (
              <button
                type="button"
                ref={(element) => {
                  pillRefs.current[row.key] = element
                }}
                aria-label={VIDEO_MARK_TEXT.title(row.time)}
                aria-haspopup="dialog"
                aria-expanded={marking?.key === row.key}
                className={[
                  'absolute right-1.5 top-1.5 inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border px-1.5 text-[10px] font-medium focus-visible:outline-2 focus-visible:outline-(--accent-primary)',
                  marking?.key === row.key
                    ? 'border-(--accent-soft-border) bg-(--accent-soft-bg) text-(--accent-soft-fg) opacity-100'
                    : 'pointer-events-none border-(--border-default) bg-(--surface-raised) text-(--text-secondary) opacity-0 hover:text-(--text-primary) group-hover/row:pointer-events-auto group-hover/row:opacity-100 group-focus-within/row:pointer-events-auto group-focus-within/row:opacity-100',
                ].join(' ')}
                onClick={() => (marking?.key === row.key ? endMark() : setMarking(row))}
              >
                <IconFlag className="h-2.5 w-2.5" />
                {VIDEO_TIMELINE_TEXT.mark}
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {marking && onMark ? (
        <VideoMarkPopover
          anchorRef={markAnchorRef}
          time={marking.time}
          where={marking.text}
          note={markNoteAt?.(marking.timeSec)}
          onCancel={endMark}
          onAdd={(note) => {
            onMark(marking.timeSec, note)
            endMark()
          }}
        />
      ) : null}
      <VideoCloseUpViewer
        closeUps={closeUps}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(undefined)}
        onPlayFrom={onPlayFrom}
      />
    </div>
  )
}
