import { VIDEO_MARK_TEXT } from '../../../headless'
import NoteForAgentPopover from './NoteForAgentPopover'

export type VideoMarkPopoverProps = {
  /** What it opens from: the flag, or a timeline row, which it stays beside. */
  anchorRef: { current: HTMLElement | null }
  /** "00:13". */
  time: string
  /** What the moment is, beside the time: a timeline row's text. Left out, "where it is now". */
  where?: string
  /** The note of the mark already waiting at this moment: it opens with it, and Save note keeps the change. */
  note?: string
  onCancel: () => void
  onAdd: (note: string) => void
}

/**
 * Marks a moment of a video, the one a paused video is at or a timeline row's: its time, an
 * optional note for the agent, and Add to message, which puts the mark in the composer. Escape,
 * Cancel or a press outside close it with no mark.
 */
export default function VideoMarkPopover({
  anchorRef,
  time,
  where = VIDEO_MARK_TEXT.whereNow,
  note,
  onCancel,
  onAdd,
}: VideoMarkPopoverProps) {
  return (
    <NoteForAgentPopover
      anchorRef={anchorRef}
      title={VIDEO_MARK_TEXT.title(time)}
      where={where}
      initialNote={note ?? ''}
      addLabel={note === undefined ? VIDEO_MARK_TEXT.add : VIDEO_MARK_TEXT.save}
      onCancel={onCancel}
      onAdd={onAdd}
    />
  )
}
