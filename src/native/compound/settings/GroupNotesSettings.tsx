import NotesSettings from './NotesSettings'

export interface GroupNotesSettingsProps {
  /** Group whose notes are managed. Undefined renders an idle empty state. */
  groupId: string | undefined
}

/**
 * A projects group's notes and secrets — {@link NotesSettings} for one group:
 * context its chats, and every agent working in one of its projects, can reach for.
 */
export default function GroupNotesSettings({ groupId }: GroupNotesSettingsProps) {
  return <NotesSettings owner={{ kind: 'group', groupId }} />
}
