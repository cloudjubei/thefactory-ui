import { Text, View } from 'react-native'
import { workStartEditable } from '../../headless/utils/appWorkStart'
import {
  APP_WORK_START_HEADING,
  APP_WORK_START_HINT,
  APP_WORK_START_LABELS,
  APP_WORK_START_ONE_FEATURE,
} from '../../headless/utils/appWorkStartConstants'
import type { AppWorkStartAsk, AppWorkStartDraft } from '../../headless/utils/appWorkStartTypes'
import { useNativeTheme } from '../hooks/useNativeTheme'
import Alert from '../primitives/Alert'
import BottomSheet from '../primitives/BottomSheet'
import { Button } from '../primitives/Button'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Textarea } from '../primitives/Textarea'

export type AppWorkStartSheetProps = {
  /** The app's `work.start` ask (`useAppWorkStart().ask`); nothing shows while `null`. */
  ask: AppWorkStartAsk | null
  onEdit: (draft: AppWorkStartDraft) => void
  onStart: () => void
  /** Decline: nothing is made. Also what dismissing the sheet does. */
  onCancel: () => void
}

/**
 * Native peer of `AppWorkStartDialog`: the person's confirmation of work an embedded app asks to
 * start, as a bottom sheet over the App view — title, description and features, editable until
 * Start makes the story. Purely presentational.
 */
export default function AppWorkStartSheet({
  ask,
  onEdit,
  onStart,
  onCancel,
}: AppWorkStartSheetProps) {
  const { theme } = useNativeTheme()
  if (!ask || ask.launching) return null
  const { draft, busy, error } = ask
  const editable = workStartEditable(ask)
  const setFeature = (index: number, patch: Partial<AppWorkStartDraft['features'][number]>) =>
    onEdit({
      ...draft,
      features: draft.features.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    })

  return (
    <BottomSheet
      isOpen
      onClose={() => {
        if (!busy) onCancel()
      }}
      title={APP_WORK_START_HEADING}
      maxHeightFraction={0.9}
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onPress={onCancel} disabled={busy}>
            {APP_WORK_START_LABELS.cancel}
          </Button>
          <Button onPress={onStart} loading={busy} disabled={busy}>
            {APP_WORK_START_LABELS.start}
          </Button>
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{APP_WORK_START_HINT}</Text>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label={APP_WORK_START_LABELS.title}>
          <Input
            value={draft.title}
            disabled={!editable}
            onChangeText={(title) => onEdit({ ...draft, title })}
          />
        </Field>
        <Field label={APP_WORK_START_LABELS.description}>
          <Textarea
            rows={5}
            value={draft.description}
            disabled={!editable}
            onChangeText={(description) => onEdit({ ...draft, description })}
          />
        </Field>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {APP_WORK_START_LABELS.features}
          </Text>
          {draft.features.length === 0 ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {APP_WORK_START_ONE_FEATURE}
            </Text>
          ) : (
            draft.features.map((feature, index) => (
              <View
                key={index}
                style={{
                  gap: 6,
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                }}
              >
                <Input
                  accessibilityLabel={APP_WORK_START_LABELS.featureTitle}
                  value={feature.title}
                  disabled={!editable}
                  onChangeText={(title) => setFeature(index, { title })}
                />
                <Textarea
                  accessibilityLabel={APP_WORK_START_LABELS.featureDescription}
                  rows={2}
                  value={feature.description}
                  disabled={!editable}
                  onChangeText={(description) => setFeature(index, { description })}
                />
              </View>
            ))
          )}
        </View>
      </View>
    </BottomSheet>
  )
}
