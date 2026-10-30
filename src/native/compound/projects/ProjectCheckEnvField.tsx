import { useState } from 'react'
import { Text, View } from 'react-native'
import type { ProjectCheckEnvSetting } from 'thefactory-tools/types'

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
import { red } from '../../../tokens/colors'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
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

function RowError({ error }: { error: string | undefined }) {
  const { status, colorScheme } = useNativeTheme()
  if (!error) return null
  return (
    <Text
      accessibilityRole="alert"
      style={{ fontSize: 12, color: colorScheme === 'dark' ? red[400] : status.stuck.softFg }}
    >
      {error}
    </Text>
  )
}

/** Native peer of web's `ProjectCheckEnvField`. */
export default function ProjectCheckEnvField({
  projectId,
  value,
  onChange,
}: ProjectCheckEnvFieldProps) {
  const { theme } = useNativeTheme()
  const [rows, setRows] = useState<ProjectCheckEnvRows>(() => projectCheckEnvRows(value))
  const { notes } = useProjectNotes(projectId)
  const secretNotes = notes.filter((note) => note.kind === 'secret')
  const errors = projectCheckEnvRowErrors(rows)
  const update = (next: ProjectCheckEnvRows) => {
    setRows(next)
    onChange(projectCheckEnvFromRows(next))
  }

  return (
    <View
      accessibilityLabel={PROJECT_CHECK_ENV_LABEL}
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
          {PROJECT_CHECK_ENV_LABEL}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{PROJECT_CHECK_ENV_HINT}</Text>
      </View>

      <Field
        label={PROJECT_CHECK_ENV_VALUES_LABEL}
        labelTrailing={
          <Button
            variant="ghost"
            size="sm"
            onPress={() => update({ ...rows, values: [...rows.values, { name: '', value: '' }] })}
          >
            {PROJECT_CHECK_ENV_ADD_VALUE}
          </Button>
        }
      >
        {rows.values.map((row, at) => (
          <View key={at} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={row.name}
                  placeholder={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                  accessibilityLabel={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(name) =>
                    update({
                      ...rows,
                      values: rows.values.map((r, i) => (i === at ? { ...r, name } : r)),
                    })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  value={row.value}
                  placeholder={PROJECT_CHECK_ENV_VALUE_PLACEHOLDER}
                  accessibilityLabel={PROJECT_CHECK_ENV_VALUE_PLACEHOLDER}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(v) =>
                    update({
                      ...rows,
                      values: rows.values.map((r, i) => (i === at ? { ...r, value: v } : r)),
                    })
                  }
                />
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => update({ ...rows, values: rows.values.filter((_, i) => i !== at) })}
              >
                {PROJECT_CHECK_ENV_REMOVE}
              </Button>
            </View>
            <RowError error={errors.values[at]} />
          </View>
        ))}
      </Field>

      <Field
        label={PROJECT_CHECK_ENV_SECRETS_LABEL}
        labelTrailing={
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              update({ ...rows, secrets: [...rows.secrets, { name: '', noteId: '' }] })
            }
          >
            {PROJECT_CHECK_ENV_ADD_SECRET}
          </Button>
        }
        {...(secretNotes.length === 0 ? { hint: PROJECT_CHECK_ENV_NO_SECRET_NOTES } : {})}
      >
        {rows.secrets.map((row, at) => (
          <View key={at} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={row.name}
                  placeholder={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                  accessibilityLabel={PROJECT_CHECK_ENV_NAME_PLACEHOLDER}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(name) =>
                    update({
                      ...rows,
                      secrets: rows.secrets.map((r, i) => (i === at ? { ...r, name } : r)),
                    })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Select
                  value={row.noteId}
                  onValueChange={(noteId) =>
                    update({
                      ...rows,
                      secrets: rows.secrets.map((r, i) => (i === at ? { ...r, noteId } : r)),
                    })
                  }
                >
                  <SelectTrigger>
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
              </View>
              <Button
                variant="ghost"
                size="sm"
                onPress={() =>
                  update({ ...rows, secrets: rows.secrets.filter((_, i) => i !== at) })
                }
              >
                {PROJECT_CHECK_ENV_REMOVE}
              </Button>
            </View>
            <RowError error={errors.secrets[at]} />
          </View>
        ))}
      </Field>
    </View>
  )
}
