import type { ProjectNoteAccess, ProjectNoteKind } from '../api'
import type { NotesOwner, ProjectNoteFormValues } from './projectNotesTypes'

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
  open: 'Any agent that reaches these notes can read this whenever it needs it.',
  ask: 'Every read asks you first.',
}

/** Marks a note an agent saved for later runs; a user's note carries no mark. */
export const NOTE_AGENT_AUTHOR_LABEL = 'By an agent'

/** Section-level explanation of the two access modes. */
export const NOTE_ACCESS_NOTE =
  'Access decides how an agent reaches a value. Open — any agent that reaches these notes can read it whenever it needs it. Ask first — every read asks you first.'

export const NOTE_KIND_HELP: Record<ProjectNoteKind, string> = {
  note: 'Plain standing context — conventions, environments, how to run things.',
  secret: 'Stored encrypted and never shown in this list. Use Reveal to see it once.',
}

/** Said on a secret's chip in place of its value. */
export const NOTE_SECRET_HIDDEN = 'A secret — its value is never shown here.'

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

/** What a notes screen says, by whose notes it manages. `addWhat` finishes "add …" in the empty state. */
export const NOTES_SCREEN_COPY: Record<
  NotesOwner['kind'],
  { title: string; intro?: string; idle: string; addWhat: string }
> = {
  project: {
    title: 'Project notes & secrets',
    idle: 'Pick a project to manage its notes and secrets.',
    addWhat: 'a note or a secret an agent can reach for',
  },
  group: {
    title: 'Group notes & secrets',
    intro:
      'Context for the whole group. Its chats, and every agent working in a project whose main group this is, can read these.',
    idle: 'Pick a group to manage its notes and secrets.',
    addWhat: 'a note or a secret every agent in this group can reach for',
  },
}
