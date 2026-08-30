import type { ProjectNoteAccess, ProjectNoteKind } from '../api'
import type { ProjectNoteFormValues } from './projectNotesTypes'

export const NOTE_KIND_LABELS: Record<ProjectNoteKind, string> = {
  note: 'Note',
  secret: 'Secret',
}

export const NOTE_ACCESS_LABELS: Record<ProjectNoteAccess, string> = {
  open: 'Open',
  ask: 'Ask first',
}

/** Honest, per-mode description of who can read the value and when. */
export const NOTE_ACCESS_HELP: Record<ProjectNoteAccess, string> = {
  open: 'Any agent working on this project can read this whenever it needs it.',
  ask: 'Every read asks you first.',
}

/** Section-level explanation of the two access modes. */
export const NOTE_ACCESS_NOTE =
  'Access decides how an agent reaches a value. Open — any agent working on this project can read it whenever it needs it. Ask first — every read asks you first.'

export const NOTE_KIND_HELP: Record<ProjectNoteKind, string> = {
  note: 'Plain standing context — conventions, environments, how to run things.',
  secret: 'Stored encrypted and never shown in this list. Use Reveal to see it once.',
}

/** Stand-in for a stored value, which is never fetched to render a list. */
export const NOTE_VALUE_MASK = '••••••••'

/** How long a revealed value stays on screen before masking itself again. */
export const NOTE_REVEAL_TIMEOUT_MS = 30_000

/** Placeholder for the value field on an edit form, where empty means "unchanged". */
export const NOTE_VALUE_UNCHANGED_HINT = 'Leave empty to keep the stored value.'

export const NOTE_LABEL_REQUIRED = 'Label is required.'
export const NOTE_VALUE_REQUIRED = 'Value is required.'

export const EMPTY_NOTE_FORM: ProjectNoteFormValues = {
  label: '',
  kind: 'note',
  value: '',
  description: '',
  access: 'ask',
}
