import {
  PROJECT_STABLE_BRANCH_LABEL,
  PROJECT_STABLE_BRANCH_PLACEHOLDER,
  projectStableBranchField,
} from '../../../headless'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export type ProjectStableBranchFieldProps = {
  /** The branch set, or nothing. */
  value: string | undefined
  /** The trimmed branch typed, or `undefined` once the field is blank. */
  onChange: (value: string | undefined) => void
}

/**
 * The project's stable branch: what another project that builds against it is
 * checked against when its pending changes break that project's checks. Says
 * why a value cannot be saved as it is typed.
 */
export default function ProjectStableBranchField({
  value,
  onChange,
}: ProjectStableBranchFieldProps) {
  const field = projectStableBranchField(value)
  return (
    <Field
      label={PROJECT_STABLE_BRANCH_LABEL}
      hint={
        field.error ? (
          <span role="alert" className="text-(--status-stuck-soft-fg)">
            {field.error}
          </span>
        ) : (
          field.hint
        )
      }
    >
      <Input
        value={field.value}
        placeholder={PROJECT_STABLE_BRANCH_PLACEHOLDER}
        aria-invalid={field.error ? true : undefined}
        spellCheck={false}
        autoCapitalize="none"
        onChange={(e) => onChange(e.target.value.trim() || undefined)}
      />
    </Field>
  )
}
