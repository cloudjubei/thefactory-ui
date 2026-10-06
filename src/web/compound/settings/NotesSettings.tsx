import { useCallback, useState } from 'react'
import type { ResourceLink } from 'thefactory-tools/types'
import {
  rankMentionMatches,
  useFiles,
  useGroupNotes,
  useProjectNotes,
  useProjectNoteReveal,
  useProjectNoteTexts,
} from '../../../headless'
import { useProjectReferenceRenderer } from '../../hooks/useReferenceRenderer'
import RichText from '../files/RichText'
import type { NoteSummary, NotesOwner } from '../../../headless/utils/projectNotesTypes'
import {
  canRevealNote,
  noteAccessLabel,
  noteAuthorLabel,
  noteKindLabel,
} from '../../../headless/utils/projectNotes'
import {
  NOTE_ACCESS_NOTE,
  NOTE_VALUE_MASK,
  NOTES_SCREEN_COPY,
} from '../../../headless/utils/projectNotesConstants'
import { Alert, Button, ConfirmDialog, Modal } from '../..'
import { CHIP_PILL_NEUTRAL } from '../chips/pillStyles'
import { IconDelete, IconEdit, IconEye, IconEyeOff, IconPlus } from '../../icons'
import ProjectNotesForm from './ProjectNotesForm'

export type NotesSettingsProps = {
  /** Whose notes are managed — a project's or a group's. An undefined id renders an idle empty state. */
  owner: NotesOwner
  /** Opens what a note points at — a story, feature, note or file. */
  onOpenReference?: (link: ResourceLink) => void
}

type ModalRoute =
  | { kind: 'create' }
  | { kind: 'edit'; note: NoteSummary }
  | { kind: 'delete'; note: NoteSummary }

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

/**
 * A project's or a group's store of standing context an agent can reach for —
 * logins for an app under test, API keys, conventions. A stored value is never rendered in
 * the list; Reveal fetches one on demand and masks it again shortly after.
 */
export default function NotesSettings({ owner, onOpenReference }: NotesSettingsProps) {
  const projectId = owner.kind === 'project' ? owner.projectId : undefined
  const groupId = owner.kind === 'group' ? owner.groupId : undefined
  // Both stores are always called (an undefined id idles one), so the hook order
  // never depends on whose notes these are.
  const projectStore = useProjectNotes(projectId)
  const groupStore = useGroupNotes(groupId)
  const { isLoaded, loadError, notes, createNote, updateNote, deleteNote, revealNote } =
    owner.kind === 'project' ? projectStore : groupStore
  const ownerId = projectId ?? groupId
  const copy = NOTES_SCREEN_COPY[owner.kind]
  const { revealedNoteId, revealedValue, revealingNoteId, revealError, reveal, hide } =
    useProjectNoteReveal(revealNote)
  const [modal, setModal] = useState<ModalRoute | null>(null)
  const noteTexts = useProjectNoteTexts(notes, revealNote)
  const { references, renderReference } = useProjectReferenceRenderer({
    projectId,
    ...(onOpenReference ? { onOpen: onOpenReference } : {}),
  })
  const { paths } = useFiles()
  const onSearchFiles = useCallback((token: string) => rankMentionMatches(paths, token, 8), [paths])
  const mentions = {
    onSearchFiles,
    onSearchReferences: references.searchWork,
    onSearchHandles: references.searchHandles,
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <Button
          onClick={() => setModal({ kind: 'create' })}
          title="Add note"
          aria-label="Add note"
          disabled={!ownerId}
        >
          <IconPlus className="h-5 w-5" />
        </Button>
      </div>

      {copy.intro ? <p className="mb-3 text-sm text-(--text-secondary)">{copy.intro}</p> : null}
      {loadError && <Alert>{loadError.message}</Alert>}
      {revealError && <Alert>{revealError}</Alert>}

      <div className="border rounded-md divide-y border-(--border-subtle) divide-(--border-subtle)">
        {!ownerId ? (
          <div className="p-4 text-sm text-(--text-secondary)">{copy.idle}</div>
        ) : !isLoaded ? (
          <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-sm text-(--text-secondary)">
            Nothing stored yet. Click the + button to add {copy.addWhat}.
          </div>
        ) : (
          notes.map((note) => {
            const isRevealed = revealedNoteId === note.id
            return (
              <div key={note.id} className="p-3 flex flex-row items-start gap-2 justify-between">
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{note.label}</span>
                    <span className={CHIP_PILL_NEUTRAL}>{noteKindLabel(note.kind)}</span>
                    <span className={CHIP_PILL_NEUTRAL}>{noteAccessLabel(note.access)}</span>
                    {noteAuthorLabel(note) && (
                      <span className={CHIP_PILL_NEUTRAL}>{noteAuthorLabel(note)}</span>
                    )}
                  </div>
                  {note.description && (
                    <div className="text-sm text-(--text-secondary) wrap-break-word">
                      <RichText
                        text={note.description}
                        renderReference={renderReference}
                        typedReferences
                      />
                    </div>
                  )}
                  {note.kind === 'secret' ? (
                    <div className="font-mono text-xs text-(--text-secondary) wrap-break-word">
                      {isRevealed && revealedValue !== null ? revealedValue : NOTE_VALUE_MASK}
                    </div>
                  ) : noteTexts.has(note.id) ? (
                    <div className="text-xs text-(--text-secondary) whitespace-pre-wrap wrap-break-word">
                      <RichText
                        text={noteTexts.get(note.id) ?? ''}
                        renderReference={renderReference}
                        typedReferences
                      />
                    </div>
                  ) : null}
                  <div className="text-[12px] text-(--text-secondary)">
                    Updated {formatUpdated(note.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canRevealNote(note) && (
                    <Button
                      onClick={() => (isRevealed ? hide() : void reveal(note.id))}
                      variant="outline"
                      size="icon"
                      title={isRevealed ? 'Hide' : 'Reveal'}
                      aria-label={isRevealed ? 'Hide' : 'Reveal'}
                      loading={revealingNoteId === note.id}
                    >
                      {isRevealed ? (
                        <IconEyeOff className="w-4 h-4" />
                      ) : (
                        <IconEye className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={() => setModal({ kind: 'edit', note })}
                    variant="outline"
                    size="icon"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <IconEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setModal({ kind: 'delete', note })}
                    variant="danger"
                    size="icon"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <IconDelete className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="text-[12px] text-(--text-secondary) mt-2">{NOTE_ACCESS_NOTE}</div>

      {modal?.kind === 'create' && (
        <Modal isOpen onClose={() => setModal(null)} title="New project note">
          <ProjectNotesForm
            mode={{ kind: 'create', onSubmit: createNote }}
            onClose={() => setModal(null)}
            mentions={mentions}
            canonicalize={references.canonicalize}
            toTyped={references.toTyped}
          />
        </Modal>
      )}
      {modal?.kind === 'edit' && (
        <Modal isOpen onClose={() => setModal(null)} title={`Edit: ${modal.note.label}`}>
          <ProjectNotesForm
            mode={{
              kind: 'edit',
              note: modal.note,
              onSubmit: (patch) => updateNote(modal.note.id, patch),
            }}
            onClose={() => setModal(null)}
            mentions={mentions}
            canonicalize={references.canonicalize}
            toTyped={references.toTyped}
          />
        </Modal>
      )}
      {modal?.kind === 'delete' && (
        <ConfirmDialog
          isOpen
          onClose={() => setModal(null)}
          title="Delete project note"
          description={`This permanently removes "${modal.note.label}". Agents working on this project will no longer be able to read it.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => deleteNote(modal.note.id)}
        />
      )}
    </div>
  )
}
