import { useEffect, useRef, useState } from 'react'

import {
  extractErrorMessage,
  groupStoryFormProblems,
  groupStoryFormRequest,
  groupStoryNeedOptions,
  type GroupProjectStoryOption,
  type GroupStoryForm as GroupStoryFormValue,
  type GroupStoryFormRow,
  type GroupStoryPartChoice,
  type GroupStoryWriteBody,
} from '../../../headless'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { NativeSelect } from '../../primitives/NativeSelect'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'

const CHOICES: { value: GroupStoryPartChoice; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'existing', label: 'Use a story' },
  { value: 'new', label: 'New story' },
]

export type GroupStoryFormProps = {
  form: GroupStoryFormValue
  onChange: (form: GroupStoryFormValue) => void
  /** Each project's stories, for "Use a story"; a project still loading has none listed. */
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  disabled?: boolean
}

/**
 * A group story's fields: its title and description, and a row per member
 * project — no part, one of its stories, or a new story — with the other parts
 * it needs first.
 */
export function GroupStoryFormFields({
  form,
  onChange,
  storiesByProject,
  disabled = false,
}: GroupStoryFormProps) {
  const setRow = (projectId: string, change: Partial<GroupStoryFormRow>) => {
    const rows = form.rows.map((r) => (r.projectId === projectId ? { ...r, ...change } : r))
    const taking = new Set(rows.filter((r) => r.choice !== 'none').map((r) => r.projectId))
    onChange({
      ...form,
      rows: rows.map((r) => ({ ...r, needs: r.needs.filter((n) => taking.has(n)) })),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Title">
        <Input
          value={form.title}
          disabled={disabled}
          placeholder="What the whole feature is"
          onChange={(e) => onChange({ ...form, title: e.target.value })}
        />
      </Field>
      <Field label="Description" hint="New part stories start with it too.">
        <Textarea
          rows={3}
          value={form.description}
          disabled={disabled}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
          Parts — one story per project
        </span>
        <ul
          role="list"
          className="flex flex-col divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle)"
        >
          {form.rows.map((row) => (
            <PartRow
              key={row.projectId}
              row={row}
              form={form}
              stories={storiesByProject[row.projectId]}
              disabled={disabled}
              onChange={(change) => setRow(row.projectId, change)}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

function PartRow({
  row,
  form,
  stories,
  disabled,
  onChange,
}: {
  row: GroupStoryFormRow
  form: GroupStoryFormValue
  stories: readonly GroupProjectStoryOption[] | undefined
  disabled: boolean
  onChange: (change: Partial<GroupStoryFormRow>) => void
}) {
  const needOptions = groupStoryNeedOptions(form, row.projectId)
  return (
    <li className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 grow truncate text-[12.5px] font-medium text-(--text-primary)">
          {row.projectTitle}
        </span>
        <SegmentedControl
          size="sm"
          ariaLabel={`How ${row.projectTitle} takes part`}
          options={CHOICES}
          value={row.choice}
          onChange={(value) => onChange({ choice: value as GroupStoryPartChoice })}
        />
      </div>
      {row.choice === 'existing' ? (
        <NativeSelect
          size="sm"
          disabled={disabled}
          aria-label={`${row.projectTitle}’s story`}
          value={row.storyId ?? ''}
          onChange={(e) => onChange({ storyId: e.target.value || undefined })}
        >
          <option value="">{stories ? 'Pick a story…' : 'Loading its stories…'}</option>
          {(stories ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </NativeSelect>
      ) : null}
      {row.choice === 'new' ? (
        <Input
          size="sm"
          disabled={disabled}
          aria-label={`${row.projectTitle}’s new story`}
          placeholder={form.title.trim() || 'The group story’s title'}
          value={row.newStoryTitle ?? ''}
          onChange={(e) => onChange({ newStoryTitle: e.target.value })}
        />
      ) : null}
      {row.choice !== 'none' && needOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-(--text-muted)">Needs first</span>
          {needOptions.map((option) => {
            const on = row.needs.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                onClick={() =>
                  onChange({
                    needs: on
                      ? row.needs.filter((n) => n !== option.id)
                      : [...row.needs, option.id],
                  })
                }
                className={`chip ${on ? 'chip--blocks' : 'chip--none'}`}
              >
                {option.title}
              </button>
            )
          })}
        </div>
      ) : null}
    </li>
  )
}

export type GroupStoryFormDialogProps = {
  isOpen: boolean
  onClose: () => void
  /** `edit` saves changes to an existing group story. */
  mode: 'new' | 'edit'
  /** The form it opens with: `groupStoryFormFor(members, story?)`. */
  initialForm: GroupStoryFormValue
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  /** Save; a rejection's reason is shown in the dialog. */
  onSave: (body: GroupStoryWriteBody) => Promise<void>
}

/** The new — or edit — group story dialog: one form, saved once nothing stops it. */
export function GroupStoryFormDialog({
  isOpen,
  onClose,
  mode,
  initialForm,
  storiesByProject,
  onSave,
}: GroupStoryFormDialogProps) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start from the form it was opened with — once per opening, so a host
  // rebuilding `initialForm` on every render never wipes what is typed.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setForm(initialForm)
      setError(null)
    }
    wasOpen.current = isOpen
  }, [isOpen, initialForm])

  const problems = groupStoryFormProblems(form)
  const save = () => {
    setSaving(true)
    setError(null)
    void onSave(groupStoryFormRequest(form))
      .then(onClose)
      .catch((err: unknown) => setError(extractErrorMessage(err, 'It could not be saved.')))
      .finally(() => setSaving(false))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={mode === 'new' ? 'New group story' : 'Edit group story'}
      footer={
        <div className="flex items-center justify-end gap-2">
          {problems.length > 0 ? (
            <span className="mr-auto text-[11.5px] text-(--text-muted)">{problems[0]}</span>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={problems.length > 0 || saving}
            onClick={save}
          >
            {mode === 'new' ? 'Create' : 'Save'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alert variant="error">{error}</Alert> : null}
        <GroupStoryFormFields
          form={form}
          onChange={setForm}
          storiesByProject={storiesByProject}
          disabled={saving}
        />
      </div>
    </Modal>
  )
}
