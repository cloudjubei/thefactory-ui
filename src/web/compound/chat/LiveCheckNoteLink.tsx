import { useNavigate } from 'react-router-dom'
import {
  LIVE_CHECK_COPY,
  openTestAccountNotes,
  resolveResourceNav,
  useProjectNotes,
  useReferenceRendering,
} from '../../../headless'
import { IconDocument } from '../../icons'

export type LiveCheckNoteLinkProps = {
  projectId: string
}

/**
 * Opens the open note holding the project's test logins, so it can be made a
 * secret: its label only, never its text. Nothing while no such note is found.
 * Native peer: `native/compound/chat/LiveCheckNoteLink`.
 */
export default function LiveCheckNoteLink({ projectId }: LiveCheckNoteLinkProps) {
  const { notes } = useProjectNotes(projectId)
  const onOpen = useReferenceRendering()?.onOpen
  const navigate = useNavigate()
  const note = openTestAccountNotes(notes)[0]
  if (!note) return null
  const open = () => {
    const link = { kind: 'note' as const, projectId, noteId: note.id }
    if (onOpen) return onOpen(link)
    const nav = resolveResourceNav(link)
    if (nav.type === 'path') navigate(nav.path)
  }
  return (
    <button
      type="button"
      onClick={open}
      aria-label={`${LIVE_CHECK_COPY.openNote}: ${note.label}`}
      className="inline-flex items-center gap-1 self-start rounded-full border border-(--border-default) bg-(--surface-base) px-2 py-0.5 text-[11.5px] text-(--text-secondary) hover:border-(--accent-primary)"
    >
      <IconDocument className="h-3 w-3 shrink-0 text-(--text-muted)" aria-hidden />
      {note.label}
      <span className="text-(--accent-primary)">· {LIVE_CHECK_COPY.openNote}</span>
    </button>
  )
}
