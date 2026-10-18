import { Text } from 'react-native'

import {
  PROJECT_STABLE_BRANCH_LABEL,
  PROJECT_STABLE_BRANCH_PLACEHOLDER,
  projectStableBranchField,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export type ProjectStableBranchFieldProps = {
  /** The branch set, or nothing. */
  value: string | undefined
  /** The trimmed branch typed, or `undefined` once the field is blank. */
  onChange: (value: string | undefined) => void
}

/** Native peer of web's `ProjectStableBranchField`. */
export default function ProjectStableBranchField({
  value,
  onChange,
}: ProjectStableBranchFieldProps) {
  const { status } = useNativeTheme()
  const field = projectStableBranchField(value)
  return (
    <Field
      label={PROJECT_STABLE_BRANCH_LABEL}
      hint={
        field.error ? (
          <Text accessibilityRole="alert" style={{ color: status.stuck.softFg }}>
            {field.error}
          </Text>
        ) : (
          field.hint
        )
      }
    >
      <Input
        value={field.value}
        placeholder={PROJECT_STABLE_BRANCH_PLACEHOLDER}
        accessibilityLabel={PROJECT_STABLE_BRANCH_LABEL}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(v) => onChange(v.trim() || undefined)}
      />
    </Field>
  )
}
