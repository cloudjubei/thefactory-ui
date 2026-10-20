import { Text, View } from 'react-native'
import {
  featureRequestLines,
  featureRequestLinesText,
} from '../../headless/utils/appFeatureRequest'
import {
  APP_FEATURE_REQUEST_HEADING,
  APP_FEATURE_REQUEST_HINT,
  APP_FEATURE_REQUEST_LABELS,
} from '../../headless/utils/appFeatureRequestConstants'
import type {
  AppFeatureRequestAsk,
  AppFeatureRequestDraft,
} from '../../headless/utils/appFeatureRequestTypes'
import { useNativeTheme } from '../hooks/useNativeTheme'
import Alert from '../primitives/Alert'
import BottomSheet from '../primitives/BottomSheet'
import { Button } from '../primitives/Button'
import Field from '../primitives/Field'
import { Input } from '../primitives/Input'
import { Textarea } from '../primitives/Textarea'

export type AppFeatureRequestSheetProps = {
  /** The app's `feature.request` ask (`useAppFeatureRequest().ask`); nothing shows while `null`. */
  ask: AppFeatureRequestAsk | null
  /** The name of the project the request goes to; its id shows when absent. */
  targetName?: string
  onEdit: (draft: AppFeatureRequestDraft) => void
  onSend: () => void
  /** Decline: nothing is sent. Also what dismissing the sheet does. */
  onCancel: () => void
}

/**
 * Native peer of `AppFeatureRequestDialog`: the person's confirmation of a feature request an
 * embedded app asks to send to another project, as a bottom sheet over the App view — where it
 * goes, then its title, summary, description and done-when lines, editable until Send. Purely
 * presentational.
 */
export default function AppFeatureRequestSheet({
  ask,
  targetName,
  onEdit,
  onSend,
  onCancel,
}: AppFeatureRequestSheetProps) {
  const { theme } = useNativeTheme()
  if (!ask) return null
  const { draft, busy, error } = ask
  const set = (patch: Partial<AppFeatureRequestDraft>) => onEdit({ ...draft, ...patch })

  return (
    <BottomSheet
      isOpen
      onClose={() => {
        if (!busy) onCancel()
      }}
      title={APP_FEATURE_REQUEST_HEADING}
      maxHeightFraction={0.9}
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onPress={onCancel} disabled={busy}>
            {APP_FEATURE_REQUEST_LABELS.cancel}
          </Button>
          <Button onPress={onSend} loading={busy} disabled={busy}>
            {APP_FEATURE_REQUEST_LABELS.send}
          </Button>
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {APP_FEATURE_REQUEST_HINT}
        </Text>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label={APP_FEATURE_REQUEST_LABELS.to}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>
            {targetName || draft.targetProjectId}
          </Text>
        </Field>
        <Field label={APP_FEATURE_REQUEST_LABELS.title}>
          <Input value={draft.title} disabled={busy} onChangeText={(title) => set({ title })} />
        </Field>
        <Field label={APP_FEATURE_REQUEST_LABELS.summary}>
          <Textarea
            rows={2}
            value={draft.summary}
            disabled={busy}
            onChangeText={(summary) => set({ summary })}
          />
        </Field>
        <Field label={APP_FEATURE_REQUEST_LABELS.description}>
          <Textarea
            rows={4}
            value={draft.description}
            disabled={busy}
            onChangeText={(description) => set({ description })}
          />
        </Field>
        <Field
          label={APP_FEATURE_REQUEST_LABELS.doneWhen}
          hint={APP_FEATURE_REQUEST_LABELS.doneWhenHint}
        >
          <Textarea
            rows={3}
            value={featureRequestLinesText(draft.doneWhen)}
            disabled={busy}
            onChangeText={(text) => set({ doneWhen: featureRequestLines(text) })}
          />
        </Field>
        {draft.references.length ? (
          <Field label={APP_FEATURE_REQUEST_LABELS.references}>
            <View style={{ gap: 4 }}>
              {draft.references.map((reference) => (
                <Text key={reference} style={{ fontSize: 13, color: theme.text.secondary }}>
                  {reference}
                </Text>
              ))}
            </View>
          </Field>
        ) : null}
      </View>
    </BottomSheet>
  )
}
