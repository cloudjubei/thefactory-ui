// Form-side shapes for the per-project notes & secrets store. The wire shapes
// (`ProjectNoteSummary`, `ProjectNoteKind`, `ProjectNoteAccess`) come from the
// generated backend client; these describe what the settings form holds and
// what it sends.

import type { ProjectNoteAccess, ProjectNoteKind } from '../api'

/** Whether the form is minting a new note or editing an existing one. */
export type ProjectNoteFormMode = 'create' | 'edit'

/**
 * Editable form state. `value` is always empty when an edit form opens — a
 * stored secret is never read back to pre-fill a field; leaving it empty on
 * submit keeps the stored value untouched.
 */
export type ProjectNoteFormValues = {
  label: string
  kind: ProjectNoteKind
  value: string
  description: string
  access: ProjectNoteAccess
}

/** Per-field validation messages; absent keys are valid. */
export type ProjectNoteFormErrors = {
  label?: string
  value?: string
}

/** POST body for a new note. */
export type ProjectNoteCreateBody = {
  label: string
  kind: ProjectNoteKind
  value: string
  description?: string
  access: ProjectNoteAccess
}

/** PATCH body carrying only the fields the user actually changed. */
export type ProjectNotePatchBody = {
  label?: string
  kind?: ProjectNoteKind
  value?: string
  description?: string
  access?: ProjectNoteAccess
}
