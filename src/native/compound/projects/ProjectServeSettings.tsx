import { Text, View } from 'react-native'

import { SERVE_BUILD_LIMIT_COPY, useProjectServeSettings } from '../../../headless'
import type { ServeBuildLimitField } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconSave } from '../../icons'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'

export type ProjectServeSettingsPanelProps = {
  field: ServeBuildLimitField
  saving?: boolean
  saved?: boolean
  saveError?: string
  onChange: (text: string) => void
  onSave: () => void
}

/** Native peer of the web serve settings: the build limit as it stands. */
export function ProjectServeSettingsPanel({
  field,
  saving = false,
  saved = false,
  saveError,
  onChange,
  onSave,
}: ProjectServeSettingsPanelProps) {
  const { theme } = useNativeTheme()
  const blocked = !field.dirty || Boolean(field.error) || saving
  return (
    <View style={{ gap: nativeSpace[3] }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
        {SERVE_BUILD_LIMIT_COPY.title}
      </Text>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        {SERVE_BUILD_LIMIT_COPY.lead}
      </Text>
      {saveError ? <Alert>{saveError}</Alert> : null}
      <Field
        label={`${SERVE_BUILD_LIMIT_COPY.label} (${SERVE_BUILD_LIMIT_COPY.unit})`}
        {...(field.error ? { error: field.error } : { hint: field.hint })}
      >
        <Input
          value={field.text}
          placeholder={field.placeholder}
          invalid={Boolean(field.error)}
          keyboardType="decimal-pad"
          disabled={saving}
          accessibilityLabel={SERVE_BUILD_LIMIT_COPY.label}
          onChangeText={onChange}
        />
      </Field>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: nativeSpace[2],
        }}
      >
        {saved && !field.dirty ? (
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>
            {SERVE_BUILD_LIMIT_COPY.saved}
          </Text>
        ) : null}
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Save"
          loading={saving}
          disabled={blocked}
          onPress={onSave}
        >
          <IconSave size={16} />
        </Button>
      </View>
    </View>
  )
}

export interface ProjectServeSettingsProps {
  projectId: string
}

/** A project's serve settings: the build limit, shown and saved on the project. */
export default function ProjectServeSettings({ projectId }: ProjectServeSettingsProps) {
  const { ready, field, saving, saveError, saved, setText, save } =
    useProjectServeSettings(projectId)
  if (!ready) return null
  return (
    <ProjectServeSettingsPanel
      field={field}
      saving={saving}
      saved={saved}
      {...(saveError ? { saveError } : {})}
      onChange={setText}
      onSave={save}
    />
  )
}
