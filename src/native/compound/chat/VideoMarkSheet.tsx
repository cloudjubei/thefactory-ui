import { VIDEO_MARK_TEXT } from '../../../headless'
import NoteForAgentSheet from './NoteForAgentSheet'

export interface VideoMarkSheetProps {
  isOpen: boolean
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
 * optional note for the agent, and Add to message, which puts the mark in the composer. Cancel or
 * closing the sheet adds no mark. Native peer of web's `VideoMarkPopover`.
 */
export default function VideoMarkSheet({
  isOpen,
  time,
  where = VIDEO_MARK_TEXT.whereNow,
  note,
  onCancel,
  onAdd,
}: VideoMarkSheetProps) {
  return (
    <NoteForAgentSheet
      isOpen={isOpen}
      title={VIDEO_MARK_TEXT.title(time)}
      where={where}
      initialNote={note ?? ''}
      addLabel={note === undefined ? VIDEO_MARK_TEXT.add : VIDEO_MARK_TEXT.save}
      onCancel={onCancel}
      onAdd={onAdd}
    />
  )
}
