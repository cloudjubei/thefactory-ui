import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ProjectNoteSummary } from '../../../headless/api'
import {
  canonicalNoteValues,
  emptyNoteForm,
  isEmptyNotePatch,
  isNoteFormValid,
  noteAccessHelp,
  noteCreateBody,
  noteFormErrors,
  noteFormValues,
  notePatchBody,
} from '../../../headless/utils/projectNotes'
import {
  NOTE_ACCESS_LABELS,
  NOTE_KIND_HELP,
  NOTE_KIND_LABELS,
  NOTE_VALUE_UNCHANGED_HINT,
} from '../../../headless/utils/projectNotesConstants'
import type {
  ProjectNoteCreateBody,
  ProjectNoteFormValues,
  ProjectNotePatchBody,
} from '../../../headless/utils/projectNotesTypes'
import { Alert, Button, Field, Input, SecretInput, SegmentedControl, Textarea } from '../..'
import { IconSave } from '../../icons'
import FileMentionsTextarea from '../files/FileMentionsTextarea'
import type { ReferenceSuggestion } from '../files/reference'

/** A note's `@` / `#` / `&` dropdowns. */
export type ProjectNotesFormMentions = {
  onSearchFiles?: (token: string) => string[]
  onSearchReferences?: (token: string) => ReferenceSuggestion[]
  onSearchHandles?: (token: string) => ReferenceSuggestion[]
}

export type ProjectNotesFormMode =
  | { kind: 'create'; onSubmit: (body: ProjectNoteCreateBody) => Promise<unknown> }
  | {
      kind: 'edit'
      note: ProjectNoteSummary
      onSubmit: (patch: ProjectNotePatchBody) => Promise<unknown>
    }

export type ProjectNotesFormProps = {
  mode: ProjectNotesFormMode
  /** Fired when the form is finished — after a successful save. The modal owns dismissal. */
  onClose: () => void
  /** What a plain note's text can point at. Omitted, it is plain text. */
  mentions?: ProjectNotesFormMentions
  /** Turns what was typed (`#3.2`, `&qa-login`) into ids on save — never in a secret. */
  canonicalize?: (text: string, before?: string) => string
}

const KIND_OPTIONS = [
  { value: 'note', label: NOTE_KIND_LABELS.note },
  { value: 'secret', label: NOTE_KIND_LABELS.secret },
]

const ACCESS_OPTIONS = [
  { value: 'ask', label: NOTE_ACCESS_LABELS.ask },
  { value: 'open', label: NOTE_ACCESS_LABELS.open },
]

/**
 * Add / edit one project note. A stored value is never read back to pre-fill
 * this form: on edit the value field starts empty and an empty value on submit
 * leaves the stored one untouched.
 */
export default function ProjectNotesForm({
  mode,
  onClose,
  mentions,
  canonicalize,
}: ProjectNotesFormProps) {
  const isEdit = mode.kind === 'edit'
  const [values, setValues] = useState<ProjectNoteFormValues>(() =>
    mode.kind === 'edit' ? noteFormValues(mode.note) : emptyNoteForm(),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formMode = isEdit ? 'edit' : 'create'
  const errors = noteFormErrors(values, formMode)
  const set = <K extends keyof ProjectNoteFormValues>(key: K, value: ProjectNoteFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isNoteFormValid(values, formMode) || submitting) return
    setSubmitting(true)
    setError(null)
    const saved = canonicalize
      ? canonicalNoteValues(values, canonicalize, mode.kind === 'edit' ? mode.note : undefined)
      : values
    try {
      if (mode.kind === 'create') {
        await mode.onSubmit(noteCreateBody(saved))
      } else {
        const patch = notePatchBody(saved, mode.note)
        if (!isEmptyNotePatch(patch)) await mode.onSubmit(patch)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this note.')
      setSubmitting(false)
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}

      <Field label="Label" hint={errors.label ?? 'How you and the agent refer to this.'}>
        <Input
          value={values.label}
          onChange={(e) => set('label', e.target.value)}
          placeholder="Staging login"
          invalid={Boolean(errors.label)}
          autoFocus
        />
      </Field>

      <Field label="Kind" hint={NOTE_KIND_HELP[values.kind]}>
        <SegmentedControl
          options={KIND_OPTIONS}
          value={values.kind}
          onChange={(value) => set('kind', value as ProjectNoteFormValues['kind'])}
          ariaLabel="Kind"
        />
      </Field>

      <Field label="Value" hint={errors.value ?? (isEdit ? NOTE_VALUE_UNCHANGED_HINT : undefined)}>
        {values.kind === 'secret' ? (
          <SecretInput
            value={values.value}
            onChange={(e) => set('value', e.target.value)}
            placeholder={isEdit ? '' : 'Paste the secret'}
            invalid={Boolean(errors.value)}
            autoComplete="off"
          />
        ) : mentions ? (
          <FileMentionsTextarea
            rows={3}
            value={values.value}
            onChange={(next) => set('value', next)}
            placeholder={
              isEdit
                ? ''
                : 'The standing context an agent should have — @ files, # stories, & notes'
            }
            className="rounded-md border border-(--border-default) bg-(--surface-raised) px-3 py-2 text-sm"
            {...mentions}
          />
        ) : (
          <Textarea
            rows={3}
            value={values.value}
            onChange={(e) => set('value', e.target.value)}
            placeholder={isEdit ? '' : 'The standing context an agent should have'}
            invalid={Boolean(errors.value)}
          />
        )}
      </Field>

      <Field label="Description" hint="Optional — when an agent should reach for this.">
        {mentions ? (
          <FileMentionsTextarea
            rows={1}
            value={values.description}
            onChange={(next) => set('description', next)}
            placeholder="Account for the app under test"
            className="rounded-md border border-(--border-default) bg-(--surface-raised) px-3 py-2 text-sm"
            {...mentions}
          />
        ) : (
          <Input
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Account for the app under test"
          />
        )}
      </Field>

      <Field label="Access" hint={noteAccessHelp(values.access)}>
        <SegmentedControl
          options={ACCESS_OPTIONS}
          value={values.access}
          onChange={(value) => set('access', value as ProjectNoteFormValues['access'])}
          ariaLabel="Access"
        />
      </Field>

      <div className="flex justify-end gap-2">
        {isEdit ? (
          <Button
            variant="secondary"
            size="icon"
            type="submit"
            title="Save"
            aria-label="Save"
            loading={submitting}
            disabled={!isNoteFormValid(values, formMode)}
          >
            <IconSave className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="submit" loading={submitting} disabled={!isNoteFormValid(values, formMode)}>
            Add note
          </Button>
        )}
      </div>
    </form>
  )
}
