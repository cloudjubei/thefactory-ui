import { useEffect } from 'react'
import { Text, View } from 'react-native'
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
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
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

/** Native peer of web's `ProjectCheckCommandsField`. */
export default function ProjectCheckCommandsField({
  value,
  onChange,
  onErrorChange,
}: ProjectCheckCommandsFieldProps) {
  const { theme } = useNativeTheme()
  const errors = projectCheckCommandsErrors(value)
  const error = projectCheckCommandsError(value)
  useEffect(() => onErrorChange?.(error), [error, onErrorChange])
  const set = (field: 'relatedTests' | 'formatFix', text: string) =>
    onChange(projectCheckCommandsFrom({ ...value, [field]: text }))

  return (
    <View
      accessibilityLabel={PROJECT_CHECK_COMMANDS_LABEL}
      style={{
        gap: 12,
        padding: 12,
        borderWidth: 1,
        borderRadius: nativeRadii[2],
        borderColor: theme.border.subtle,
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
          {PROJECT_CHECK_COMMANDS_LABEL}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {PROJECT_CHECK_COMMANDS_HINT}
        </Text>
      </View>
      <Field
        label={PROJECT_CHECK_COMMANDS_RELATED_LABEL}
        hint={PROJECT_CHECK_COMMANDS_RELATED_HINT}
        error={errors.relatedTests}
      >
        <Input
          value={value?.relatedTests ?? ''}
          placeholder={PROJECT_CHECK_COMMANDS_RELATED_PLACEHOLDER}
          accessibilityLabel={PROJECT_CHECK_COMMANDS_RELATED_LABEL}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(text) => set('relatedTests', text)}
        />
      </Field>
      <Field
        label={PROJECT_CHECK_COMMANDS_FORMAT_LABEL}
        hint={PROJECT_CHECK_COMMANDS_FORMAT_HINT}
        error={errors.formatFix}
      >
        <Input
          value={value?.formatFix ?? ''}
          placeholder={PROJECT_CHECK_COMMANDS_FORMAT_PLACEHOLDER}
          accessibilityLabel={PROJECT_CHECK_COMMANDS_FORMAT_LABEL}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(text) => set('formatFix', text)}
        />
      </Field>
    </View>
  )
}
