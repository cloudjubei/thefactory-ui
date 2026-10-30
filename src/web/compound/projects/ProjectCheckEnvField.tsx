import { useState } from 'react'

import { useProjectNotes } from '../../../headless/hooks/useProjectNotes'
import {
  projectCheckEnvFromRows,
  projectCheckEnvRowErrors,
  projectCheckEnvRows,
} from '../../../headless/utils/projectCheckEnv'
import {
  PROJECT_CHECK_ENV_ADD_SECRET,
  PROJECT_CHECK_ENV_ADD_VALUE,
  PROJECT_CHECK_ENV_HINT,
  PROJECT_CHECK_ENV_LABEL,
  PROJECT_CHECK_ENV_NAME_PLACEHOLDER,
  PROJECT_CHECK_ENV_NO_SECRET_NOTES,
  PROJECT_CHECK_ENV_NOTE_PLACEHOLDER,
  PROJECT_CHECK_ENV_REMOVE,
  PROJECT_CHECK_ENV_SECRETS_LABEL,
  PROJECT_CHECK_ENV_VALUE_PLACEHOLDER,
  PROJECT_CHECK_ENV_VALUES_LABEL,
} from '../../../headless/utils/projectCheckEnvConstants'
import type { ProjectCheckEnvRows } from '../../../headless/utils/projectCheckEnvTypes'
import type { ProjectCheckEnvSetting } from 'thefactory-tools/types'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'

export type ProjectCheckEnvFieldProps = {
  /** The project whose secret notes a secret is picked from; none while it is being created. */
  projectId: string | undefined
  /** The live check env set, or none. */
  value: ProjectCheckEnvSetting | undefined
  /** The env as edited; `undefined` once nothing is set. */
  onChange: (next: ProjectCheckEnvSetting | undefined) => void
}

/**
 * The project's live check env: plain values, and secrets read from its secret
 * notes when a live check runs. Says why each row cannot be saved.
 */
export default function ProjectCheckEnvField({
  projectId,
  value,
  onChange,
}: ProjectCheckEnvFieldProps) {
  const [rows, setRows] = useState<ProjectCheckEnvRows>(() => projectCheckEnvRows(value))
  const { notes } = useProjectNotes(projectId)
  const secretNotes = notes.filter((note) => note.kind === 'secret')
  const errors = projectCheckEnvRowErrors(rows)
  const update = (next: ProjectCheckEnvRows) => {
    setRows(next)
    onChange(projectCheckEnvFromRows(next))
  }

  return (
    <section
      aria-label={PROJECT_CHECK_ENV_LABEL}
      className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) p-3"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{PROJECT_CHECK_ENV_LABEL}</span>
        <span className="text-xs text-(--text-secondary)">{PROJECT_CHECK_ENV_HINT}</span>
      </div>

      <div role="group" aria-label={PROJECT_CHECK_ENV_VALUES_LABEL} className="flex flex-col gap-2">
        <span className="text-sm font-medium">{PROJECT_CHECK_ENV_VALUES_LABEL}</span>
        {rows.values.map((row, at) => (
          <div key={at} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                className="flex-1 font-mono"
                value={row.name}
                placeholder={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                aria-label={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                aria-invalid={errors.values[at] ? true : undefined}
                spellCheck={false}
                autoCapitalize="none"
                onChange={(e) =>
                  update({
                    ...rows,
                    values: rows.values.map((r, i) =>
                      i === at ? { ...r, name: e.target.value } : r,
                    ),
                  })
                }
              />
              <Input
                className="flex-1 font-mono"
                value={row.value}
                placeholder={PROJECT_CHECK_ENV_VALUE_PLACEHOLDER}
                aria-label={PROJECT_CHECK_ENV_VALUE_PLACEHOLDER}
                spellCheck={false}
                autoCapitalize="none"
                onChange={(e) =>
                  update({
                    ...rows,
                    values: rows.values.map((r, i) =>
                      i === at ? { ...r, value: e.target.value } : r,
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => update({ ...rows, values: rows.values.filter((_, i) => i !== at) })}
              >
                {PROJECT_CHECK_ENV_REMOVE}
              </Button>
            </div>
            {errors.values[at] ? (
              <span role="alert" className="field-error text-xs">
                {errors.values[at]}
              </span>
            ) : null}
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => update({ ...rows, values: [...rows.values, { name: '', value: '' }] })}
          >
            {PROJECT_CHECK_ENV_ADD_VALUE}
          </Button>
        </div>
      </div>

      <div
        role="group"
        aria-label={PROJECT_CHECK_ENV_SECRETS_LABEL}
        className="flex flex-col gap-2"
      >
        <span className="text-sm font-medium">{PROJECT_CHECK_ENV_SECRETS_LABEL}</span>
        {rows.secrets.map((row, at) => (
          <div key={at} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                className="flex-1 font-mono"
                value={row.name}
                placeholder={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                aria-label={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                aria-invalid={errors.secrets[at] ? true : undefined}
                spellCheck={false}
                autoCapitalize="none"
                onChange={(e) =>
                  update({
                    ...rows,
                    secrets: rows.secrets.map((r, i) =>
                      i === at ? { ...r, name: e.target.value } : r,
                    ),
                  })
                }
              />
              <div className="flex-1">
                <Select
                  value={row.noteId}
                  onValueChange={(noteId) =>
                    update({
                      ...rows,
                      secrets: rows.secrets.map((r, i) => (i === at ? { ...r, noteId } : r)),
                    })
                  }
                >
                  <SelectTrigger aria-label={PROJECT_CHECK_ENV_NOTE_PLACEHOLDER}>
                    <SelectValue placeholder={PROJECT_CHECK_ENV_NOTE_PLACEHOLDER} />
                  </SelectTrigger>
                  <SelectContent>
                    {secretNotes.map((note) => (
                      <SelectItem key={note.id} value={note.id}>
                        {note.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  update({ ...rows, secrets: rows.secrets.filter((_, i) => i !== at) })
                }
              >
                {PROJECT_CHECK_ENV_REMOVE}
              </Button>
            </div>
            {errors.secrets[at] ? (
              <span role="alert" className="field-error text-xs">
                {errors.secrets[at]}
              </span>
            ) : null}
          </div>
        ))}
        {secretNotes.length === 0 ? (
          <span className="text-xs opacity-60">{PROJECT_CHECK_ENV_NO_SECRET_NOTES}</span>
        ) : null}
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              update({ ...rows, secrets: [...rows.secrets, { name: '', noteId: '' }] })
            }
          >
            {PROJECT_CHECK_ENV_ADD_SECRET}
          </Button>
        </div>
      </div>
    </section>
  )
}
