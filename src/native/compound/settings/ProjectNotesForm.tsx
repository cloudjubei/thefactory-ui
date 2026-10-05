import { useState } from 'react'
import { View } from 'react-native'

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
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { SecretInput } from '../../primitives/SecretInput'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
import FileMentionsTextarea from '../files/FileMentionsTextarea'
import type { ReferenceSuggestion } from '../../../headless/utils/reference'

/** A note's `@` / `#` / `&` suggestions. */
export type ProjectNotesFormMentions = {
  onSearchFiles?: (token: string) => ReadonlyArray<string>
  onSearchReferences?: (token: string) => ReadonlyArray<ReferenceSuggestion>
  onSearchHandles?: (token: string) => ReadonlyArray<ReferenceSuggestion>
}
import { IconSave } from '../../icons'
import { nativeSpace } from '../../../tokens/native'

export type ProjectNotesFormMode =
  | { kind: 'create'; onSubmit: (body: ProjectNoteCreateBody) => Promise<unknown> }
  | {
      kind: 'edit'
      note: ProjectNoteSummary
      onSubmit: (patch: ProjectNotePatchBody) => Promise<unknown>
    }

export interface ProjectNotesFormProps {
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
 * Native peer of
 * [web's `ProjectNotesForm`](../../../web/compound/settings/ProjectNotesForm.tsx).
 * Same prop surface; a stored value is never read back to pre-fill the form.
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

  const submit = async () => {
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
    <View style={{ gap: nativeSpace[4] }}>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Field label="Label" hint={errors.label ?? 'How you and the agent refer to this.'}>
        <Input
          value={values.label}
          onChangeText={(text) => set('label', text)}
          placeholder="Staging login"
          invalid={Boolean(errors.label)}
          accessibilityLabel="Label"
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
            onChangeText={(text) => set('value', text)}
            placeholder={isEdit ? '' : 'Paste the secret'}
            invalid={Boolean(errors.value)}
            accessibilityLabel="Value"
          />
        ) : mentions ? (
          <FileMentionsTextarea
            rows={3}
            value={values.value}
            onChangeText={(text) => set('value', text)}
            placeholder={
              isEdit
                ? ''
                : 'The standing context an agent should have — @ files, # stories, & notes'
            }
            {...mentions}
          />
        ) : (
          <Textarea
            rows={3}
            value={values.value}
            onChangeText={(text) => set('value', text)}
            placeholder={isEdit ? '' : 'The standing context an agent should have'}
            invalid={Boolean(errors.value)}
            accessibilityLabel="Value"
          />
        )}
      </Field>

      <Field label="Description" hint="Optional — when an agent should reach for this.">
        {mentions ? (
          <FileMentionsTextarea
            rows={1}
            value={values.description}
            onChangeText={(text) => set('description', text)}
            placeholder="Account for the app under test"
            {...mentions}
          />
        ) : (
          <Input
            value={values.description}
            onChangeText={(text) => set('description', text)}
            placeholder="Account for the app under test"
            accessibilityLabel="Description"
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

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
        {isEdit ? (
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Save"
            loading={submitting}
            disabled={!isNoteFormValid(values, formMode)}
            onPress={() => void submit()}
          >
            <IconSave size={16} />
          </Button>
        ) : (
          <Button
            loading={submitting}
            disabled={!isNoteFormValid(values, formMode)}
            onPress={() => void submit()}
          >
            Add note
          </Button>
        )}
      </View>
    </View>
  )
}
