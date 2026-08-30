import { useState } from 'react'
import { useProjectNotes, useProjectNoteReveal } from '../../../headless'
import type { ProjectNoteSummary } from '../../../headless/api'
import { canRevealNote, noteAccessLabel, noteKindLabel } from '../../../headless/utils/projectNotes'
import { NOTE_ACCESS_NOTE, NOTE_VALUE_MASK } from '../../../headless/utils/projectNotesConstants'
import { Alert, Button, ConfirmDialog, Modal } from '../..'
import { CHIP_PILL_NEUTRAL } from '../chips/pillStyles'
import { IconDelete, IconEdit, IconEye, IconEyeOff, IconPlus } from '../../icons'
import ProjectNotesForm from './ProjectNotesForm'

export type ProjectNotesSettingsProps = {
  /** Project whose notes are managed. Undefined renders an idle empty state. */
  projectId: string | undefined
}

type ModalRoute =
  | { kind: 'create' }
  | { kind: 'edit'; note: ProjectNoteSummary }
  | { kind: 'delete'; note: ProjectNoteSummary }

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

/**
 * Per-project store of standing context an agent can reach for — logins for an
 * app under test, API keys, conventions. A stored value is never rendered in
 * the list; Reveal fetches one on demand and masks it again shortly after.
 */
export default function ProjectNotesSettings({ projectId }: ProjectNotesSettingsProps) {
  const { isLoaded, loadError, notes, createNote, updateNote, deleteNote, revealNote } =
    useProjectNotes(projectId)
  const { revealedNoteId, revealedValue, revealingNoteId, revealError, reveal, hide } =
    useProjectNoteReveal(revealNote)
  const [modal, setModal] = useState<ModalRoute | null>(null)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Project notes &amp; secrets</h2>
        <Button
          onClick={() => setModal({ kind: 'create' })}
          title="Add note"
          aria-label="Add note"
          disabled={!projectId}
        >
          <IconPlus className="h-5 w-5" />
        </Button>
      </div>

      {loadError && <Alert>{loadError.message}</Alert>}
      {revealError && <Alert>{revealError}</Alert>}

      <div className="border rounded-md divide-y border-(--border-subtle) divide-(--border-subtle)">
        {!projectId ? (
          <div className="p-4 text-sm text-(--text-secondary)">
            Pick a project to manage its notes and secrets.
          </div>
        ) : !isLoaded ? (
          <div className="p-4 text-sm text-(--text-secondary)">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-sm text-(--text-secondary)">
            Nothing stored yet. Click the + button to add a note or a secret an agent can reach for.
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
                  </div>
                  {note.description && (
                    <div className="text-sm text-(--text-secondary) wrap-break-word">
                      {note.description}
                    </div>
                  )}
                  <div className="font-mono text-xs text-(--text-secondary) wrap-break-word">
                    {isRevealed && revealedValue !== null ? revealedValue : NOTE_VALUE_MASK}
                  </div>
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
