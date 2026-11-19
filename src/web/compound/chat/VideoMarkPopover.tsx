import { VIDEO_MARK_TEXT } from '../../../headless'
import NoteForAgentPopover from './NoteForAgentPopover'

export type VideoMarkPopoverProps = {
  /** What it opens from: the flag, which it stays beside. */
  anchorRef: { current: HTMLElement | null }
  /** "00:13". */
  time: string
  onCancel: () => void
  onAdd: (note: string) => void
}

/**
 * Marks the moment a paused video is at: its time, an optional note for the agent, and Add to
 * message, which puts the mark in the composer. Escape, Cancel or a press outside close it with
 * no mark.
 */
export default function VideoMarkPopover({
  anchorRef,
  time,
  onCancel,
  onAdd,
}: VideoMarkPopoverProps) {
  return (
    <NoteForAgentPopover
      anchorRef={anchorRef}
      title={VIDEO_MARK_TEXT.title(time)}
      where={VIDEO_MARK_TEXT.whereNow}
      onCancel={onCancel}
      onAdd={onAdd}
    />
  )
}
