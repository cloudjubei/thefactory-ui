import { Text, View } from 'react-native'
import {
  DELIVERY_SETTINGS_COPY,
  type DeliveryFormDraft,
  type DeliveryMergeChoice,
  type DeliveryPrFirstChoice,
  type DeliverySettingsView,
} from '../../../headless'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import Alert from '../../primitives/Alert'
import { Button } from '../../primitives/Button'
import Field from '../../primitives/Field'
import { Input } from '../../primitives/Input'
import SegmentedControl from '../../primitives/SegmentedControl'

export interface DeliverySettingsPanelProps {
  /** What the form shows; nothing until the owner is read. */
  view: DeliverySettingsView | undefined
  draft: DeliveryFormDraft
  /** Why the last save failed. */
  error: string | null
  onChange: (next: DeliveryFormDraft) => void
  /** Save the form; resolves `true` when kept. */
  onSave: () => Promise<boolean>
  onReset: () => void
}

/**
 * Native peer of web's `DeliverySettingsPanel`: a group's or a project's
 * delivery in its Settings — the branch name template with the name it makes,
 * the base branch, pull request first, and the merge method.
 */
export default function DeliverySettingsPanel({
  view,
  draft,
  error,
  onChange,
  onSave,
  onReset,
}: DeliverySettingsPanelProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[4] }}>
      <View style={{ gap: nativeSpace[1] }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
          {DELIVERY_SETTINGS_COPY.heading}
        </Text>
        {view ? (
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.intro}</Text>
        ) : null}
      </View>
      {!view ? (
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {DELIVERY_SETTINGS_COPY.loading}
        </Text>
      ) : (
        <View style={{ gap: nativeSpace[4] }}>
          {error ? <Alert>{error}</Alert> : null}
          <Field
            label={DELIVERY_SETTINGS_COPY.templateField}
            hint={DELIVERY_SETTINGS_COPY.templateHint}
            error={view.problems.branchTemplate}
          >
            <Input
              value={draft.branchTemplate}
              disabled={!view.editable}
              placeholder={view.templatePlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={DELIVERY_SETTINGS_COPY.templateField}
              onChangeText={(branchTemplate) => onChange({ ...draft, branchTemplate })}
            />
          </Field>
          {'branch' in view.preview ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                {DELIVERY_SETTINGS_COPY.previewLabel}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  fontSize: 12,
                  fontFamily: nativeFontFamilies.mono,
                  color: theme.text.primary,
                  backgroundColor: theme.surface.muted,
                  borderRadius: nativeRadii[1],
                  paddingHorizontal: nativeSpace[2],
                  overflow: 'hidden',
                }}
              >
                {view.preview.branch}
              </Text>
            </View>
          ) : null}
          <Field
            label={DELIVERY_SETTINGS_COPY.baseField}
            hint={DELIVERY_SETTINGS_COPY.baseHint}
            error={view.problems.baseBranch}
          >
            <Input
              value={draft.baseBranch}
              disabled={!view.editable}
              placeholder={view.basePlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={DELIVERY_SETTINGS_COPY.baseField}
              onChangeText={(baseBranch) => onChange({ ...draft, baseBranch })}
            />
          </Field>
          <Field
            label={DELIVERY_SETTINGS_COPY.titleField}
            hint={DELIVERY_SETTINGS_COPY.titleHint}
            error={view.problems.prTitleTemplate}
          >
            <Input
              value={draft.prTitleTemplate}
              disabled={!view.editable}
              placeholder={view.titlePlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={DELIVERY_SETTINGS_COPY.titleField}
              onChangeText={(prTitleTemplate) => onChange({ ...draft, prTitleTemplate })}
            />
          </Field>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {DELIVERY_SETTINGS_COPY.previewLabel}
            </Text>
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 12, color: theme.text.primary }}
            >
              {view.titlePreview}
            </Text>
          </View>
          <Field
            label={DELIVERY_SETTINGS_COPY.prFirstField}
            hint={DELIVERY_SETTINGS_COPY.prFirstHint}
          >
            <SegmentedControl
              ariaLabel={DELIVERY_SETTINGS_COPY.prFirstField}
              size="sm"
              value={draft.prFirst}
              options={view.prFirstOptions}
              onChange={(prFirst) =>
                view.editable && onChange({ ...draft, prFirst: prFirst as DeliveryPrFirstChoice })
              }
            />
          </Field>
          <Field label={DELIVERY_SETTINGS_COPY.mergeField} hint={DELIVERY_SETTINGS_COPY.mergeHint}>
            <SegmentedControl
              ariaLabel={DELIVERY_SETTINGS_COPY.mergeField}
              size="sm"
              value={draft.mergeMethod}
              options={view.mergeOptions}
              onChange={(mergeMethod) =>
                view.editable &&
                onChange({ ...draft, mergeMethod: mergeMethod as DeliveryMergeChoice })
              }
            />
          </Field>
          {view.editable ? (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              {view.dirty ? (
                <Button variant="ghost" size="sm" onPress={onReset}>
                  {DELIVERY_SETTINGS_COPY.reset}
                </Button>
              ) : null}
              <Button size="sm" disabled={!view.canSave} onPress={() => void onSave()}>
                {DELIVERY_SETTINGS_COPY.save}
              </Button>
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}
