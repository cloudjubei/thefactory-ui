import type { MutableRefObject } from 'react'
import { Text, View, type StyleProp, type ViewStyle } from 'react-native'
import {
  useCreateFromTemplateForm,
  type UseCreateFromTemplateForm,
  type UseCreateFromTemplateFormOptions,
} from '../../headless/hooks/useCreateFromTemplateForm'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import Alert from '../primitives/Alert'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/Select'
import Spinner from '../primitives/Spinner'
import ProjectGithubRepoField from './projects/ProjectGithubRepoField'
import TemplatePicker from './TemplatePicker'

export type CreateFromTemplateFormProps = UseCreateFromTemplateFormOptions & {
  style?: StyleProp<ViewStyle>
  /**
   * Latest form controller for a host footer (Abort while submitting, disable
   * Create until `canSubmit`). Updated every render; read via `.current`.
   */
  formRef?: MutableRefObject<UseCreateFromTemplateForm | null>
}

/**
 * Native peer of the web `CreateFromTemplateForm`. Same fields and progress
 * surface; driven by {@link useCreateFromTemplateForm}.
 */
export default function CreateFromTemplateForm({
  style,
  formRef,
  ...opts
}: CreateFromTemplateFormProps) {
  const form = useCreateFromTemplateForm(opts)
  const { theme } = useNativeTheme()
  if (formRef) formRef.current = form

  const {
    template,
    setTemplate,
    name,
    setName,
    id,
    setId,
    idAvailability,
    mainGroupId,
    setMainGroupId,
    mainGroups,
    github,
    errors,
    submitting,
    progressLabel,
    copy,
  } = form

  const idHint =
    idAvailability === 'taken'
      ? copy.idTakenHint
      : idAvailability === 'available'
        ? copy.idAvailableHint
        : copy.idHint

  return (
    <View style={[{ gap: nativeSpace[4] }, style]}>
      {submitting ? (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            gap: nativeSpace[3],
            paddingVertical: nativeSpace[8],
            paddingHorizontal: nativeSpace[4],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        >
          <Spinner size={28} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {copy.creating}
          </Text>
          {progressLabel ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>{progressLabel}</Text>
          ) : null}
        </View>
      ) : (
        <>
          <View style={{ gap: nativeSpace[2] }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
              {copy.pickTemplate}
            </Text>
            <TemplatePicker
              value={template?.id}
              onSelect={setTemplate}
              style={{ maxHeight: 320 }}
            />
          </View>

          <Field label={copy.nameLabel} hint={copy.nameHint}>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="My investments"
              disabled={!template}
            />
          </Field>

          <Field
            label={copy.idLabel}
            hint={idHint}
            error={idAvailability === 'taken' ? copy.idTakenHint : undefined}
          >
            <Input
              value={id}
              onChangeText={setId}
              placeholder="my-investments"
              autoCapitalize="none"
              autoCorrect={false}
              disabled={!template}
            />
          </Field>

          {mainGroups.length > 0 ? (
            <Field label={copy.groupLabel}>
              <Select
                value={mainGroupId ?? '__none__'}
                onValueChange={(v) => setMainGroupId(v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={copy.groupNone} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{copy.groupNone}</SelectItem>
                  {mainGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <ProjectGithubRepoField github={github} />
        </>
      )}

      {errors.length > 0 ? (
        <Alert variant="error">{errors.map((m) => `• ${m}`).join('\n')}</Alert>
      ) : null}
    </View>
  )
}
