import { View } from 'react-native'
import {
  REMOTE_BROWSER_TEXT,
  noteLabel,
  type AppNote,
  type RemoteBrowserNote,
} from '../../../headless'
import AppNoteChips from '../chat/AppNoteChips'

export type RemoteBrowserNotesProps = {
  projectId: string
  notes: RemoteBrowserNote[]
  onEdit: (id: string, comment: string) => void
  onRemove: (id: string) => void
}

/** Native peer of web's `RemoteBrowserNotes`: the picks and marks staged above the composer. */
export default function RemoteBrowserNotes({
  projectId,
  notes,
  onEdit,
  onRemove,
}: RemoteBrowserNotesProps) {
  if (!notes.length) return null
  const rows: AppNote[] = notes.map((note) => ({
    id: note.id,
    projectId,
    comment: note.comment,
    targets: [{ kind: 'element', selector: noteLabel(note), outerHtml: note.url }],
  }))
  return (
    <View accessibilityLabel={REMOTE_BROWSER_TEXT.notes} style={{ padding: 8 }}>
      <AppNoteChips
        appNotes={rows}
        onChangeAppNotes={(next) => {
          for (const note of notes) {
            const row = next.find((r) => r.id === note.id)
            if (!row) onRemove(note.id)
            else if (row.comment !== note.comment) onEdit(note.id, row.comment)
          }
        }}
      />
    </View>
  )
}
