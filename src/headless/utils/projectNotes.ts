// Pure form logic for the per-project notes & secrets store: validation, the
// create / patch bodies, and list ordering. No React, no I/O — and no helper
// here ever handles a stored secret value (it is only ever revealed on demand,
// straight from the API into the component that asked for it).

import type { ProjectNoteSummary } from '../api'
import {
  EMPTY_NOTE_FORM,
  NOTE_ACCESS_HELP,
  NOTE_ACCESS_LABELS,
  NOTE_KIND_LABELS,
  NOTE_LABEL_REQUIRED,
  NOTE_VALUE_REQUIRED,
} from './projectNotesConstants'
import type {
  ProjectNoteCreateBody,
  ProjectNoteFormErrors,
  ProjectNoteFormMode,
  ProjectNoteFormValues,
  ProjectNotePatchBody,
} from './projectNotesTypes'

/** A blank create-form, defaulting to the more careful access mode. */
export function emptyNoteForm(): ProjectNoteFormValues {
  return { ...EMPTY_NOTE_FORM }
}

/**
 * Seed an edit form from a summary. `value` stays empty: the list never holds a
 * stored value, and an empty value on submit means "keep what's stored".
 */
export function noteFormValues(note: ProjectNoteSummary): ProjectNoteFormValues {
  return {
    label: note.label,
    kind: note.kind,
    value: '',
    description: note.description ?? '',
    access: note.access,
  }
}

/** Per-field validation. A value is required to create, optional to edit. */
export function noteFormErrors(
  values: ProjectNoteFormValues,
  mode: ProjectNoteFormMode,
): ProjectNoteFormErrors {
  const errors: ProjectNoteFormErrors = {}
  if (!values.label.trim()) errors.label = NOTE_LABEL_REQUIRED
  if (mode === 'create' && !values.value.trim()) errors.value = NOTE_VALUE_REQUIRED
  return errors
}

/** Whether the form can be submitted in this mode. */
export function isNoteFormValid(values: ProjectNoteFormValues, mode: ProjectNoteFormMode): boolean {
  return Object.keys(noteFormErrors(values, mode)).length === 0
}

/** POST body for a new note; a blank description is omitted rather than sent empty. */
export function noteCreateBody(values: ProjectNoteFormValues): ProjectNoteCreateBody {
  const body: ProjectNoteCreateBody = {
    label: values.label.trim(),
    kind: values.kind,
    value: values.value.trim(),
    access: values.access,
  }
  const description = values.description.trim()
  if (description) body.description = description
  return body
}

/**
 * PATCH body holding only what changed against the stored summary. An empty
 * value field is omitted (the stored value stays); an emptied description is
 * sent as `''` so the user can actually clear it.
 */
export function notePatchBody(
  values: ProjectNoteFormValues,
  note: ProjectNoteSummary,
): ProjectNotePatchBody {
  const patch: ProjectNotePatchBody = {}
  const label = values.label.trim()
  if (label !== note.label) patch.label = label
  if (values.kind !== note.kind) patch.kind = values.kind
  if (values.access !== note.access) patch.access = values.access
  const description = values.description.trim()
  if (description !== (note.description ?? '')) patch.description = description
  const value = values.value.trim()
  if (value) patch.value = value
  return patch
}

/** True when a patch would change nothing — the caller can skip the request. */
export function isEmptyNotePatch(patch: ProjectNotePatchBody): boolean {
  return Object.keys(patch).length === 0
}

/** Stable display order: secrets and notes interleaved, sorted by label. */
export function sortNotes(notes: ProjectNoteSummary[]): ProjectNoteSummary[] {
  return [...notes].sort((a, b) => {
    const byLabel = a.label.toLowerCase().localeCompare(b.label.toLowerCase())
    return byLabel !== 0 ? byLabel : a.id.localeCompare(b.id)
  })
}

/** Whether a per-note Reveal action applies (only a secret hides its value). */
export function canRevealNote(note: ProjectNoteSummary): boolean {
  return note.kind === 'secret'
}

export function noteKindLabel(kind: ProjectNoteSummary['kind']): string {
  return NOTE_KIND_LABELS[kind]
}

export function noteAccessLabel(access: ProjectNoteSummary['access']): string {
  return NOTE_ACCESS_LABELS[access]
}

export function noteAccessHelp(access: ProjectNoteSummary['access']): string {
  return NOTE_ACCESS_HELP[access]
}
