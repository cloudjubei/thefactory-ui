import { useState } from 'react'

import { LAUNCH_CAPS_COPY, type LaunchCapFieldView, type LaunchCapKey } from '../../../headless'
import { IconChevron } from '../../icons'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export type LaunchCapsFieldsProps = {
  fields: readonly LaunchCapFieldView[]
  /** The limits set, in short: what the section says while folded. */
  summary: string
  /** The launch's worst case, shown folded or not. */
  worstCase?: string
  /** A word under the fields: a group's limits, each project's defaults. */
  note?: string
  busy?: boolean
  onChange: (key: LaunchCapKey, text: string) => void
}

/** One limit's field, the same on the launch card and in the project editor. */
export function LaunchCapField({
  field,
  busy,
  onChange,
}: {
  field: LaunchCapFieldView
  busy: boolean
  onChange: (text: string) => void
}) {
  return (
    <Field
      label={`${field.label} (${field.unit})`}
      hint={field.fromProject ? LAUNCH_CAPS_COPY.fromProject : field.hint}
      {...(field.error ? { error: field.error } : {})}
    >
      <Input
        value={field.text}
        invalid={Boolean(field.error)}
        inputMode="decimal"
        disabled={busy}
        placeholder={field.placeholder}
        aria-label={field.label}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

/**
 * A launch's limits: spend, time, attempts, questions and each check's timeout,
 * folded to one line with the worst case the attempts come to. Open, each
 * starts from the agent's ask, else the project's default.
 */
export default function LaunchCapsFields({
  fields,
  summary,
  worstCase,
  note,
  busy = false,
  onChange,
}: LaunchCapsFieldsProps) {
  const invalid = fields.some((field) => field.error)
  const [open, setOpen] = useState(false)
  const shown = open || invalid
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={shown}
        onClick={() => setOpen(!open)}
        className="flex w-full min-w-0 items-center gap-2 text-left text-[12px]"
      >
        <IconChevron
          className={`size-3 shrink-0 text-(--text-muted) transition-transform ${shown ? 'rotate-90' : ''}`}
        />
        <span className="font-medium text-(--text-secondary)">{LAUNCH_CAPS_COPY.heading}</span>
        <span className="min-w-0 truncate text-(--text-muted)">{summary}</span>
      </button>
      {worstCase ? <div className="pl-5 text-[11.5px] text-(--text-muted)">{worstCase}</div> : null}
      {shown ? (
        <div className="grid grid-cols-1 gap-2 pl-5 sm:grid-cols-2">
          {fields.map((field) => (
            <LaunchCapField
              key={field.key}
              field={field}
              busy={busy}
              onChange={(text) => onChange(field.key, text)}
            />
          ))}
          {note ? (
            <div className="text-[11px] text-(--text-muted) sm:col-span-2">{note}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
