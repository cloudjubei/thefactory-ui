import { useState, type ReactNode } from 'react'

import {
  PROCESS_LAUNCH_COPY,
  addProcessLaunchVariant,
  isProcessLaunchOneRef,
  processLaunchLayout,
  processLaunchPatchLabel,
  processLaunchRefToggleLabel,
  processLaunchVariantRows,
  processLaunchVariants,
  removeProcessLaunchVariant,
  setProcessLaunchRef,
  setProcessLaunchValue,
  setProcessLaunchVariantField,
  setProcessLaunchVariantLabel,
  toggleProcessLaunchOneRef,
  type ProcessLaunchDraft,
  type ProcessLaunchFieldDraft,
  type ProcessLaunchNoteName,
  type ProcessLaunchProblem,
  type ProcessLaunchRefDraft,
  type ProcessLaunchRepos,
  type ProcessLaunchVariantDraft,
} from '../../../headless'
import type { ProcessInput, ProcessInputField } from 'thefactory-tools/types'
import { IconChevron, IconClose, IconDocument, IconPlus } from '../../icons'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import { Textarea } from '../../primitives/Textarea'
import RefChip from '../chips/RefChip'

/** A note the form can pick. */
export type ProcessLaunchNote = ProcessLaunchNoteName

export type ProcessLaunchFieldsProps = {
  inputs: readonly ProcessInput[]
  draft: ProcessLaunchDraft
  repos: ProcessLaunchRepos
  /** The form's first problem. */
  problem: ProcessLaunchProblem | undefined
  /** Mark the field that holds it: once the form was touched, or it came with one. */
  marked: boolean
  notes: readonly ProcessLaunchNote[]
  busy: boolean
  onChange: (next: ProcessLaunchDraft) => void
}

const LABEL = 'text-[12.5px] font-medium text-(--text-secondary)'
const NONE = '__none__'

function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <span className={LABEL}>
      {text}
      {optional ? (
        <small className="ml-1 font-normal text-(--text-muted)">
          {PROCESS_LAUNCH_COPY.optional}
        </small>
      ) : null}
    </span>
  )
}

function NoteField({
  label,
  value,
  notes,
  optional,
  bad,
  busy,
  onPick,
}: {
  label: string
  value: string
  notes: readonly ProcessLaunchNote[]
  optional?: boolean
  bad: boolean
  busy: boolean
  onPick: (noteId: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel text={label} {...(optional ? { optional } : {})} />
      <Select
        value={value || NONE}
        onValueChange={(v) => onPick(v === NONE ? '' : v)}
        disabled={busy}
      >
        <SelectTrigger
          aria-label={label}
          aria-invalid={bad || undefined}
          className={`w-full ${bad ? 'border-red-400' : ''}`}
        >
          <SelectValue placeholder={PROCESS_LAUNCH_COPY.chooseNote} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            {optional ? PROCESS_LAUNCH_COPY.patchNone : PROCESS_LAUNCH_COPY.chooseNote}
          </SelectItem>
          {notes.map((note) => (
            <SelectItem key={note.id} value={note.id}>
              <span className="inline-flex items-center gap-1.5">
                <IconDocument className="size-3 shrink-0" />
                {note.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function TextField({
  label,
  value,
  bad,
  busy,
  mode,
  mono,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  bad: boolean
  busy: boolean
  mode?: 'numeric'
  mono?: boolean
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <FieldLabel text={label} />
      <Input
        value={value}
        invalid={bad}
        disabled={busy}
        aria-label={label}
        className={mono ? 'font-mono' : undefined}
        {...(mode ? { inputMode: mode } : {})}
        {...(placeholder ? { placeholder } : {})}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function RefRows({
  rows,
  repos,
  notes,
  fieldKey,
  problem,
  marked,
  busy,
  onChange,
}: {
  rows: readonly ProcessLaunchRefDraft[]
  repos: ProcessLaunchRepos
  notes: readonly ProcessLaunchNote[]
  fieldKey: string
  problem: ProcessLaunchProblem | undefined
  marked: boolean
  busy: boolean
  onChange: (rows: readonly ProcessLaunchRefDraft[]) => void
}) {
  const toggle = processLaunchRefToggleLabel(rows, repos)
  const bad = (row: ProcessLaunchRefDraft) =>
    marked && problem?.fieldKey === fieldKey && row.ref.trim() === ''
  const pickPatch = (row: ProcessLaunchRefDraft, noteId: string) => {
    if (!noteId) return onChange(setProcessLaunchRef(rows, row.repo.key, { patch: '' }))
    const label = notes.find((n) => n.id === noteId)?.label
    onChange(
      setProcessLaunchRef(rows, row.repo.key, {
        patchNote: noteId,
        ...(label ? { patchLabel: label } : {}),
      }),
    )
  }
  const one = isProcessLaunchOneRef(rows, repos)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        {rows.map((row) => (
          <TextField
            key={row.repo.key}
            label={one ? PROCESS_LAUNCH_COPY.ref : row.repo.label}
            value={row.ref}
            bad={bad(row)}
            busy={busy}
            mono
            placeholder={PROCESS_LAUNCH_COPY.refPlaceholder}
            onChange={(ref) => onChange(setProcessLaunchRef(rows, row.repo.key, { ref }))}
          />
        ))}
      </div>
      {toggle ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onChange(toggleProcessLaunchOneRef(rows, repos))}
          className="self-start text-[12px] text-(--accent-primary) hover:underline"
        >
          {toggle}
        </button>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        {rows.map((row) => (
          <NoteField
            key={row.repo.key}
            label={processLaunchPatchLabel(row.repo, rows.length)}
            value={row.patchNote ?? ''}
            notes={notes}
            optional
            bad={false}
            busy={busy}
            onPick={(noteId) => pickPatch(row, noteId)}
          />
        ))}
      </div>
    </div>
  )
}

function InputField({
  field,
  value,
  fieldKey,
  props,
  onChange,
}: {
  field: Pick<ProcessInputField, 'kind' | 'label' | 'required'>
  value: ProcessLaunchFieldDraft | undefined
  fieldKey: string
  props: ProcessLaunchFieldsProps
  onChange: (value: ProcessLaunchFieldDraft) => void
}) {
  const { problem, marked, busy, notes, repos } = props
  const bad = marked && problem?.fieldKey === fieldKey
  if (field.kind === 'refs') {
    return (
      <RefRows
        rows={typeof value === 'string' || !value ? [] : value}
        repos={repos}
        notes={notes}
        fieldKey={fieldKey}
        problem={problem}
        marked={marked}
        busy={busy}
        onChange={onChange}
      />
    )
  }
  const text = typeof value === 'string' ? value : ''
  if (field.kind === 'note-reference') {
    return (
      <NoteField
        label={field.label}
        value={text}
        notes={notes}
        {...(field.required ? {} : { optional: true })}
        bad={bad}
        busy={busy}
        onPick={onChange}
      />
    )
  }
  if (field.kind === 'number') {
    return (
      <TextField
        label={field.label}
        value={text}
        bad={bad}
        busy={busy}
        mode="numeric"
        onChange={onChange}
      />
    )
  }
  return (
    <label className="flex flex-col gap-1">
      <FieldLabel text={field.label} {...(field.required ? {} : { optional: true })} />
      <Textarea
        rows={3}
        value={text}
        disabled={busy}
        aria-label={field.label}
        aria-invalid={bad || undefined}
        className={bad ? 'border-red-400' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function VariantBody({
  input,
  variant,
  props,
}: {
  input: ProcessInput
  variant: ProcessLaunchVariantDraft
  props: ProcessLaunchFieldsProps
}) {
  const { draft, problem, marked, busy, onChange } = props
  const labelKey = `${input.name}.${variant.key}.label`
  return (
    <div className="flex flex-col gap-2.5 border-t border-(--border-subtle) px-3 py-3">
      <TextField
        label={PROCESS_LAUNCH_COPY.variantLabel}
        value={variant.label}
        bad={marked && problem?.fieldKey === labelKey}
        busy={busy}
        placeholder={PROCESS_LAUNCH_COPY.variantLabelHint}
        onChange={(label) =>
          onChange(setProcessLaunchVariantLabel(draft, input.name, variant.key, label))
        }
      />
      {(input.fields ?? []).map((field) => (
        <InputField
          key={field.name}
          field={field}
          value={variant.values[field.name]}
          fieldKey={`${input.name}.${variant.key}.${field.name}`}
          props={props}
          onChange={(value) =>
            onChange(
              setProcessLaunchVariantField(draft, input.name, variant.key, field.name, value),
            )
          }
        />
      ))}
    </div>
  )
}

function VariantList({ input, props }: { input: ProcessInput; props: ProcessLaunchFieldsProps }) {
  const { draft, repos, problem, marked, busy, onChange } = props
  const variants = processLaunchVariants(draft, input.name)
  const [picked, setPicked] = useState<string | undefined | null>(
    variants.length === 1 && variants[0]!.label === '' ? variants[0]!.key : undefined,
  )
  const open = picked ?? (marked ? problem?.variantKey : undefined)
  const rows = processLaunchVariantRows(variants, marked ? problem : undefined, props.notes)
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel text={input.label} />
      <div className="overflow-hidden rounded-lg border border-(--border-default)">
        {rows.map((row, at) => {
          const variant = variants[at]!
          const shown = open === row.key
          return (
            <div
              key={row.key}
              className={`border-b border-(--border-subtle) last:border-b-0 ${
                row.bad ? 'bg-(--status-stuck-soft-bg)' : ''
              }`}
            >
              <div className="flex min-w-0 items-center gap-1 pr-2">
                <button
                  type="button"
                  aria-expanded={shown}
                  onClick={() => setPicked(shown ? null : row.key)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left"
                >
                  <IconChevron
                    className={`size-3 shrink-0 text-(--text-muted) transition-transform ${shown ? 'rotate-90' : ''}`}
                  />
                  <span
                    className={`shrink-0 text-[13px] font-semibold ${row.unnamed ? 'text-(--text-muted)' : 'text-(--text-primary)'}`}
                  >
                    {row.name}
                  </span>
                  {shown ? null : (
                    <span className="flex min-w-0 flex-wrap items-center gap-1">
                      {row.chips.map((chip) =>
                        chip.kind === 'ref' ? (
                          <RefChip key={chip.key} value={chip.text} kind="commit" />
                        ) : (
                          <span
                            key={chip.key}
                            className="inline-flex items-center gap-1 rounded-full border border-(--border-default) px-2 py-px text-[11.5px] text-(--text-secondary)"
                          >
                            <IconDocument className="size-3" />
                            {chip.text}
                          </span>
                        ),
                      )}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={PROCESS_LAUNCH_COPY.removeVariant(at + 1)}
                  onClick={() => onChange(removeProcessLaunchVariant(draft, input.name, row.key))}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--surface-hover)"
                >
                  <IconClose className="size-3.5" />
                </button>
              </div>
              {shown ? <VariantBody input={input} variant={variant} props={props} /> : null}
            </div>
          )
        })}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const next = addProcessLaunchVariant(draft, input, repos)
          onChange(next)
          setPicked(processLaunchVariants(next, input.name).at(-1)?.key)
        }}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-(--border-strong) px-2.5 py-1 text-[11.5px] text-(--text-muted) hover:border-(--accent-primary) hover:text-(--text-primary)"
      >
        <IconPlus className="size-3" />
        {PROCESS_LAUNCH_COPY.addVariant}
      </button>
    </div>
  )
}

/** One input of the form, whatever its kind. */
function Fill({
  input,
  props,
}: {
  input: ProcessInput
  props: ProcessLaunchFieldsProps
}): ReactNode {
  const { draft, onChange } = props
  if (input.kind === 'variants') return <VariantList input={input} props={props} />
  const value = draft.values[input.name] as ProcessLaunchFieldDraft | undefined
  const field = input as ProcessInput & Pick<ProcessInputField, 'kind'>
  return (
    <InputField
      field={field}
      value={value}
      fieldKey={input.name}
      props={props}
      onChange={(next) => onChange(setProcessLaunchValue(draft, input.name, next))}
    />
  )
}

/**
 * A process's form, drawn from what it asks for: the short inputs side by side,
 * then each long one, and each variant folded to one line of its refs and
 * patches until it is opened.
 */
export default function ProcessLaunchFields(props: ProcessLaunchFieldsProps) {
  const { short, long } = processLaunchLayout(props.inputs)
  return (
    <div className="flex flex-col gap-3">
      {short.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {short.map((input) => (
            <Fill key={input.name} input={input} props={props} />
          ))}
        </div>
      ) : null}
      {long.map((input) => (
        <Fill key={input.name} input={input} props={props} />
      ))}
    </div>
  )
}
