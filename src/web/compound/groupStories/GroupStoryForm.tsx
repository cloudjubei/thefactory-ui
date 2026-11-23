import { useEffect, useRef, useState } from 'react'

import {
  extractErrorMessage,
  GROUP_STORY_FORM_LABELS as TEXT,
  groupStoryFormMovedPart,
  groupStoryFormPartMoves,
  groupStoryFormProblems,
  groupStoryFormRequest,
  groupStoryFormWithLink,
  groupStoryFormWithLinkStory,
  groupStoryFormWithoutLink,
  groupStoryFormWithoutPart,
  groupStoryFormWithPart,
  groupStoryNeedOptions,
  type GroupProjectStoryOption,
  type GroupStoryForm as GroupStoryFormValue,
  type GroupStoryFormLink,
  type GroupStoryFormRow,
  type GroupStoryPartChoice,
  type GroupStoryWriteBody,
} from '../../../headless'
import { IconArrowDown, IconArrowUp, IconDelete, IconPlus } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import { NativeSelect } from '../../primitives/NativeSelect'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'

const CHOICES: { value: GroupStoryPartChoice; label: string }[] = [
  { value: 'existing', label: TEXT.existing },
  { value: 'new', label: TEXT.new },
]

const ICON_BUTTON =
  'inline-flex size-7 shrink-0 items-center justify-center rounded text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) disabled:opacity-40 disabled:hover:bg-transparent'

const HEADING = 'text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)'

export type GroupStoryFormProps = {
  form: GroupStoryFormValue
  onChange: (form: GroupStoryFormValue) => void
  /** Each project's stories, for "Use a story" and links; a project still loading has none listed. */
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  disabled?: boolean
}

/**
 * A group story's fields: its title and description; its parts, each
 * project's in the order they run — one of its stories or a new one, moved up
 * or down, with the other projects' parts it needs first; and the stories it
 * links, tracked only.
 */
export function GroupStoryFormFields({
  form,
  onChange,
  storiesByProject,
  disabled = false,
}: GroupStoryFormProps) {
  const setRow = (key: string, change: Partial<GroupStoryFormRow>) =>
    onChange({ ...form, rows: form.rows.map((r) => (r.key === key ? { ...r, ...change } : r)) })

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
        <span className={HEADING}>{TEXT.parts}</span>
        <span className="text-[11px] text-(--text-muted)">{TEXT.partsHint}</span>
        <ul
          role="list"
          className="flex flex-col divide-y divide-(--border-subtle) rounded-md border border-(--border-subtle)"
        >
          {form.projects.map((project) => {
            const rows = form.rows.filter((r) => r.projectId === project.id)
            return (
              <li key={project.id} className="flex flex-col gap-2 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 grow truncate text-[12.5px] font-medium text-(--text-primary)">
                    {project.title}
                  </span>
                  {rows.length === 0 ? (
                    <span className="text-[11px] text-(--text-muted)">{TEXT.noParts}</span>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => onChange(groupStoryFormWithPart(form, project.id))}
                  >
                    <IconPlus className="size-3.5" />
                    {TEXT.addPart}
                  </Button>
                </div>
                {rows.length > 0 ? (
                  <ol className="flex flex-col gap-2">
                    {rows.map((row, i) => (
                      <PartRow
                        key={row.key}
                        row={row}
                        place={rows.length > 1 ? i + 1 : undefined}
                        form={form}
                        storiesByProject={storiesByProject}
                        disabled={disabled}
                        onChange={(change) => setRow(row.key, change)}
                        onMove={(direction) =>
                          onChange(groupStoryFormMovedPart(form, row.key, direction))
                        }
                        onRemove={() => onChange(groupStoryFormWithoutPart(form, row.key))}
                      />
                    ))}
                  </ol>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
      <LinkedStories
        form={form}
        onChange={onChange}
        storiesByProject={storiesByProject}
        disabled={disabled}
      />
    </div>
  )
}

function PartRow({
  row,
  place,
  form,
  storiesByProject,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  row: GroupStoryFormRow
  place: number | undefined
  form: GroupStoryFormValue
  storiesByProject: Readonly<Record<string, readonly GroupProjectStoryOption[]>>
  disabled: boolean
  onChange: (change: Partial<GroupStoryFormRow>) => void
  onMove: (direction: 'up' | 'down') => void
  onRemove: () => void
}) {
  const stories = storiesByProject[row.projectId]
  const needOptions = groupStoryNeedOptions(form, row.key, storiesByProject)
  const moves = groupStoryFormPartMoves(form, row.key)
  const name = place ? `${row.projectTitle} story ${place}` : `${row.projectTitle}’s story`
  return (
    <li className="flex flex-col gap-2 rounded border border-(--border-subtle) px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {place ? (
          <span className="text-[11px] tabular-nums text-(--text-muted)">{place}.</span>
        ) : null}
        <SegmentedControl
          size="sm"
          ariaLabel={`How ${name} is made`}
          options={CHOICES}
          value={row.choice}
          onChange={(value) => onChange({ choice: value as GroupStoryPartChoice })}
        />
        <span className="grow" />
        {place ? (
          <>
            <button
              type="button"
              className={ICON_BUTTON}
              disabled={disabled || !moves.up}
              aria-label={TEXT.moveUp(name)}
              title={TEXT.moveUp(name)}
              onClick={() => onMove('up')}
            >
              <IconArrowUp className="size-4" />
            </button>
            <button
              type="button"
              className={ICON_BUTTON}
              disabled={disabled || !moves.down}
              aria-label={TEXT.moveDown(name)}
              title={TEXT.moveDown(name)}
              onClick={() => onMove('down')}
            >
              <IconArrowDown className="size-4" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={disabled}
          aria-label={TEXT.remove(name)}
          title={TEXT.remove(name)}
          onClick={onRemove}
        >
          <IconDelete className="size-4" />
        </button>
      </div>
      {row.choice === 'existing' ? (
        <NativeSelect
          size="sm"
          disabled={disabled}
          aria-label={name}
          value={row.storyId ?? ''}
          onChange={(e) => onChange({ storyId: e.target.value || undefined })}
        >
          <option value="">{stories ? TEXT.pickStory : TEXT.loadingStories}</option>
          {(stories ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </NativeSelect>
      ) : (
        <Input
          size="sm"
          disabled={disabled}
          aria-label={`${name}, new`}
          placeholder={form.title.trim() || 'The group story’s title'}
          value={row.newStoryTitle ?? ''}
          onChange={(e) => onChange({ newStoryTitle: e.target.value })}
        />
      )}
      {needOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-(--text-muted)">{TEXT.needsFirst}</span>
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

function LinkedStories({
  form,
  onChange,
  storiesByProject,
  disabled,
}: GroupStoryFormProps & { disabled: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={HEADING}>{TEXT.linked}</span>
      <span className="text-[11px] text-(--text-muted)">{TEXT.linkedHint}</span>
      {form.links.length > 0 ? (
        <ul role="list" className="flex flex-col gap-1.5">
          {form.links.map((link) => (
            <LinkRow
              key={link.key}
              link={link}
              stories={storiesByProject[link.projectId]}
              disabled={disabled}
              onPick={(storyId) => onChange(groupStoryFormWithLinkStory(form, link.key, storyId))}
              onRemove={() => onChange(groupStoryFormWithoutLink(form, link.key))}
            />
          ))}
        </ul>
      ) : null}
      <NativeSelect
        size="sm"
        disabled={disabled}
        aria-label={TEXT.addLink}
        value=""
        onChange={(e) => {
          if (e.target.value) onChange(groupStoryFormWithLink(form, e.target.value))
        }}
      >
        <option value="">{`${TEXT.addLink}…`}</option>
        {form.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}

function LinkRow({
  link,
  stories,
  disabled,
  onPick,
  onRemove,
}: {
  link: GroupStoryFormLink
  stories: readonly GroupProjectStoryOption[] | undefined
  disabled: boolean
  onPick: (storyId: string | undefined) => void
  onRemove: () => void
}) {
  const name = `the linked ${link.projectTitle} story`
  return (
    <li className="flex items-center gap-2 rounded border border-(--border-subtle) px-2.5 py-1.5">
      <span className="shrink-0 text-[12px] font-medium text-(--text-primary)">
        {link.projectTitle}
      </span>
      <NativeSelect
        size="sm"
        className="min-w-0 grow"
        disabled={disabled}
        aria-label={name}
        value={link.storyId ?? ''}
        onChange={(e) => onPick(e.target.value || undefined)}
      >
        <option value="">{stories ? TEXT.pickStory : TEXT.loadingStories}</option>
        {(stories ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </NativeSelect>
      <button
        type="button"
        className={ICON_BUTTON}
        disabled={disabled}
        aria-label={TEXT.remove(name)}
        title={TEXT.remove(name)}
        onClick={onRemove}
      >
        <IconDelete className="size-4" />
      </button>
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
