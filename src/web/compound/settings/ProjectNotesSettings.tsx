import type { ResourceLink } from 'thefactory-tools/types'
import NotesSettings from './NotesSettings'

export type ProjectNotesSettingsProps = {
  /** Project whose notes are managed. Undefined renders an idle empty state. */
  projectId: string | undefined
  /** Opens what a note points at — a story, feature, note or file. */
  onOpenReference?: (link: ResourceLink) => void
  /** The note a link opened the screen on (`?note=`): shown selected and scrolled to. */
  selectedNoteId?: string
}

/** A project's notes and secrets — {@link NotesSettings} for one project. */
export default function ProjectNotesSettings({
  projectId,
  onOpenReference,
  selectedNoteId,
}: ProjectNotesSettingsProps) {
  return (
    <NotesSettings
      owner={{ kind: 'project', projectId }}
      {...(onOpenReference ? { onOpenReference } : {})}
      {...(selectedNoteId ? { selectedNoteId } : {})}
    />
  )
}
