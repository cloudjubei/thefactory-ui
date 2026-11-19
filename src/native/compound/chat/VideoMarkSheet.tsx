import { VIDEO_MARK_TEXT } from '../../../headless'
import NoteForAgentSheet from './NoteForAgentSheet'

export interface VideoMarkSheetProps {
  isOpen: boolean
  /** "00:13". */
  time: string
  onCancel: () => void
  onAdd: (note: string) => void
}

/**
 * Marks the moment a paused video is at: its time, an optional note for the agent, and Add to
 * message, which puts the mark in the composer. Cancel or closing the sheet adds no mark. Native
 * peer of web's `VideoMarkPopover`.
 */
export default function VideoMarkSheet({ isOpen, time, onCancel, onAdd }: VideoMarkSheetProps) {
  return (
    <NoteForAgentSheet
      isOpen={isOpen}
      title={VIDEO_MARK_TEXT.title(time)}
      where={VIDEO_MARK_TEXT.whereNow}
      onCancel={onCancel}
      onAdd={onAdd}
    />
  )
}
