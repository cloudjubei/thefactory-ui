import NotesSettings from './NotesSettings'

export interface GroupNotesSettingsProps {
  /** Group whose notes are managed. Undefined renders an idle empty state. */
  groupId: string | undefined
  /** The note a link opened the screen on (`?note=`): shown selected and scrolled to. */
  selectedNoteId?: string
  /** Where the selected note's row lies, from the top of these settings — for the host to scroll to. */
  onSelectedNoteLayout?: (y: number) => void
}

/**
 * A projects group's notes and secrets — {@link NotesSettings} for one group:
 * context its chats, and every agent working in one of its projects, can reach for.
 */
export default function GroupNotesSettings({
  groupId,
  selectedNoteId,
  onSelectedNoteLayout,
}: GroupNotesSettingsProps) {
  return (
    <NotesSettings
      owner={{ kind: 'group', groupId }}
      {...(selectedNoteId ? { selectedNoteId } : {})}
      {...(onSelectedNoteLayout ? { onSelectedNoteLayout } : {})}
    />
  )
}
