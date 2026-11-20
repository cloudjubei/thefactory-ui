import { useEffect } from 'react'
import type { ProjectCheckCommandsSetting } from 'thefactory-tools/types'

import {
  projectCheckCommandsError,
  projectCheckCommandsErrors,
  projectCheckCommandsFrom,
} from '../../../headless/utils/projectCheckCommands'
import {
  PROJECT_CHECK_COMMANDS_FORMAT_HINT,
  PROJECT_CHECK_COMMANDS_FORMAT_LABEL,
  PROJECT_CHECK_COMMANDS_FORMAT_PLACEHOLDER,
  PROJECT_CHECK_COMMANDS_HINT,
  PROJECT_CHECK_COMMANDS_LABEL,
  PROJECT_CHECK_COMMANDS_RELATED_HINT,
  PROJECT_CHECK_COMMANDS_RELATED_LABEL,
  PROJECT_CHECK_COMMANDS_RELATED_PLACEHOLDER,
} from '../../../headless/utils/projectCheckCommandsConstants'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export type ProjectCheckCommandsFieldProps = {
  /** The commands set, or none. */
  value: ProjectCheckCommandsSetting | undefined
  /** The commands as edited; `undefined` once both are empty. */
  onChange: (next: ProjectCheckCommandsSetting | undefined) => void
  /** Told why the commands cannot be saved as they are, and `undefined` once they can. */
  onErrorChange?: (error: string | undefined) => void
}

/**
 * The project's check commands: the command that runs the unit tests related
 * to some files, and the one that fixes what the format check finds — each
 * empty to keep what the checks detect. Says why each cannot be saved.
 */
export default function ProjectCheckCommandsField({
  value,
  onChange,
  onErrorChange,
}: ProjectCheckCommandsFieldProps) {
  const errors = projectCheckCommandsErrors(value)
  const error = projectCheckCommandsError(value)
  useEffect(() => onErrorChange?.(error), [error, onErrorChange])
  const set = (field: 'relatedTests' | 'formatFix', text: string) =>
    onChange(projectCheckCommandsFrom({ ...value, [field]: text }))

  return (
    <section
      aria-label={PROJECT_CHECK_COMMANDS_LABEL}
      className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) p-3"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{PROJECT_CHECK_COMMANDS_LABEL}</span>
        <span className="text-xs text-(--text-secondary)">{PROJECT_CHECK_COMMANDS_HINT}</span>
      </div>
      <Field
        label={PROJECT_CHECK_COMMANDS_RELATED_LABEL}
        hint={PROJECT_CHECK_COMMANDS_RELATED_HINT}
        error={errors.relatedTests}
      >
        <Input
          className="font-mono"
          value={value?.relatedTests ?? ''}
          placeholder={PROJECT_CHECK_COMMANDS_RELATED_PLACEHOLDER}
          aria-invalid={errors.relatedTests ? true : undefined}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(e) => set('relatedTests', e.target.value)}
        />
      </Field>
      <Field
        label={PROJECT_CHECK_COMMANDS_FORMAT_LABEL}
        hint={PROJECT_CHECK_COMMANDS_FORMAT_HINT}
        error={errors.formatFix}
      >
        <Input
          className="font-mono"
          value={value?.formatFix ?? ''}
          placeholder={PROJECT_CHECK_COMMANDS_FORMAT_PLACEHOLDER}
          aria-invalid={errors.formatFix ? true : undefined}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(e) => set('formatFix', e.target.value)}
        />
      </Field>
    </section>
  )
}
