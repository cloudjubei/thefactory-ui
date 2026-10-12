import { useState } from 'react'
import type { FormEvent } from 'react'
import type { StoryNote } from 'thefactory-tools/types'
import {
  extractErrorMessage,
  storyNoteAuthorLabel,
  storyNoteFormError,
  storyNoteFormValues,
  storyNotePatch,
  useStories,
} from '../../../headless'
import { STORY_NOTES_COPY } from '../../../headless/utils/storyNotesConstants'
import type { StoryNoteFormValues } from '../../../headless/utils/storyNotesTypes'
import { Alert, Button, ConfirmDialog, Field, Input, Modal, Textarea } from '../..'
import { CHIP_PILL_NEUTRAL } from '../chips/pillStyles'
import { IconDelete, IconEdit, IconPlus, IconSave } from '../../icons'

export type StoryNotesSectionProps = {
  storyId: string
  /** The feature the notes are kept with; omitted, the story's own notes. */
  featureId?: string
  notes: readonly StoryNote[]
  /** Starts with the list folded away when there are no notes, for a compact row. */
  compact?: boolean
}

type ModalRoute =
  | { kind: 'create' }
  | { kind: 'edit'; note: StoryNote }
  | { kind: 'delete'; note: StoryNote }

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

function StoryNoteForm({
  note,
  onSubmit,
}: {
  note?: StoryNote
  onSubmit: (values: StoryNoteFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<StoryNoteFormValues>(() => storyNoteFormValues(note))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const invalid = storyNoteFormError(values)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      setError(extractErrorMessage(err, 'The note could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
      <Field label={STORY_NOTES_COPY.labelField}>
        <Input
          value={values.label}
          placeholder={STORY_NOTES_COPY.labelPlaceholder}
          onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
          autoFocus
        />
      </Field>
      <Field label={STORY_NOTES_COPY.valueField}>
        <Textarea
          value={values.value}
          rows={6}
          placeholder={STORY_NOTES_COPY.valuePlaceholder}
          onChange={(e) => setValues((v) => ({ ...v, value: e.target.value }))}
        />
      </Field>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="icon"
          variant="primary"
          title={STORY_NOTES_COPY.save}
          aria-label={STORY_NOTES_COPY.save}
          loading={saving}
          disabled={invalid !== undefined}
        >
          <IconSave className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

/**
 * The notes kept with a story or one of its features — what agents hand the
 * next run or step, and what a person adds — with add, edit and delete.
 */
export default function StoryNotesSection({
  storyId,
  featureId,
  notes,
  compact = false,
}: StoryNotesSectionProps) {
  const { addStoryNote, updateStoryNote, removeStoryNote } = useStories()
  const [modal, setModal] = useState<ModalRoute | null>(null)
  const [open, setOpen] = useState(!compact || notes.length > 0)

  const create = async (values: StoryNoteFormValues) => {
    await addStoryNote(storyId, {
      label: values.label.trim(),
      value: values.value,
      ...(featureId ? { featureId } : {}),
    })
    setModal(null)
  }

  const edit = async (note: StoryNote, values: StoryNoteFormValues) => {
    const patch = storyNotePatch(note, values)
    if (Object.keys(patch).length > 0) await updateStoryNote(storyId, note.id, patch)
    setModal(null)
  }

  return (
    <section aria-label={STORY_NOTES_COPY.title} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-[12px] font-semibold uppercase tracking-wide text-(--text-secondary)"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {STORY_NOTES_COPY.title} ({notes.length})
        </button>
        <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'create' })}>
          <IconPlus className="w-3.5 h-3.5" />
          {STORY_NOTES_COPY.add}
        </Button>
      </div>
      {open ? (
        notes.length === 0 ? (
          <div className="text-[12.5px] text-(--text-secondary)">
            {featureId ? STORY_NOTES_COPY.featureHint : STORY_NOTES_COPY.storyHint}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-(--border-subtle) rounded-lg border border-(--border-subtle)">
            {notes.map((note) => (
              <div key={note.id} className="flex items-start justify-between gap-2 p-2.5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{note.label}</span>
                    <span className={CHIP_PILL_NEUTRAL}>{storyNoteAuthorLabel(note)}</span>
                  </div>
                  <div className="whitespace-pre-wrap wrap-break-word text-[12.5px] text-(--text-secondary)">
                    {note.value}
                  </div>
                  <div className="text-[11.5px] text-(--text-tertiary)">
                    {STORY_NOTES_COPY.updated} {formatUpdated(note.updatedAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    title={STORY_NOTES_COPY.edit}
                    aria-label={STORY_NOTES_COPY.edit}
                    onClick={() => setModal({ kind: 'edit', note })}
                  >
                    <IconEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="icon"
                    title={STORY_NOTES_COPY.remove}
                    aria-label={STORY_NOTES_COPY.remove}
                    onClick={() => setModal({ kind: 'delete', note })}
                  >
                    <IconDelete className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {modal?.kind === 'create' ? (
        <Modal isOpen onClose={() => setModal(null)} title={STORY_NOTES_COPY.newTitle}>
          <StoryNoteForm onSubmit={create} />
        </Modal>
      ) : null}
      {modal?.kind === 'edit' ? (
        <Modal
          isOpen
          onClose={() => setModal(null)}
          title={STORY_NOTES_COPY.editTitle(modal.note.label)}
        >
          <StoryNoteForm note={modal.note} onSubmit={(values) => edit(modal.note, values)} />
        </Modal>
      ) : null}
      {modal?.kind === 'delete' ? (
        <ConfirmDialog
          isOpen
          onClose={() => setModal(null)}
          title={STORY_NOTES_COPY.deleteTitle}
          description={STORY_NOTES_COPY.deleteDescription(modal.note.label)}
          confirmLabel={STORY_NOTES_COPY.deleteConfirm}
          destructive
          onConfirm={() => removeStoryNote(storyId, modal.note.id)}
        />
      ) : null}
    </section>
  )
}
