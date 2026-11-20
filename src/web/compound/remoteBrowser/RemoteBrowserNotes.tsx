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

/**
 * The picks and marks added from the browser, staged above the composer as App picks are: each
 * its number and element or area, its note, and a way off. Held by the browser until the
 * composer takes app notes itself.
 */
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
    <section aria-label={REMOTE_BROWSER_TEXT.notes}>
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
    </section>
  )
}
