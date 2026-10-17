import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'

import {
  PARK_NOTE_MAX_LENGTH,
  PROOF_CHANGE_CANCEL_LABEL,
  PROOF_CHANGE_HEADING,
  PROOF_CHANGE_NOTE_PLACEHOLDER,
  PROOF_CHANGE_SAVE_LABEL,
  PROOF_CHANGE_SEND_LABEL,
  proofChangeDraftStart,
  proofChangeView,
  toggleProofChangeKind,
  type ProcessProofChangeOffer,
  type ProofChangeDraft,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'

export type ProofChangeComposerProps = {
  offer: ProcessProofChangeOffer
  onSend: (draft: ProofChangeDraft) => void
  onCancel: () => void
}

/**
 * Change what proves the stopped work, written in place of the choice row:
 * each kind as a switch with how it stood, the ones this run cannot produce
 * held off unless the work already needed them, saving it to the feature on a
 * feature's run, and why.
 */
export default function ProofChangeComposer({ offer, onSend, onCancel }: ProofChangeComposerProps) {
  const { theme, status } = useNativeTheme()
  const [draft, setDraft] = useState<ProofChangeDraft>(() => proofChangeDraftStart(offer))
  const view = proofChangeView(offer, draft)

  return (
    <View style={{ width: '100%', gap: nativeSpace[2] }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 11,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          color: theme.text.muted,
        }}
      >
        {PROOF_CHANGE_HEADING}
      </Text>
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{view.hint}</Text>
      {view.kinds.map((kind) => (
        <View key={kind.kind} style={{ gap: 2 }}>
          <Switch
            checked={kind.checked}
            disabled={kind.disabled}
            onCheckedChange={() => setDraft((d) => toggleProofChangeKind(d, kind.kind))}
            label={kind.label}
          />
          {kind.standing ? (
            <Text style={{ fontSize: 10.5, color: theme.text.secondary, paddingLeft: 40 }}>
              {kind.standing.word} — {kind.standing.detail}
            </Text>
          ) : null}
          {kind.unavailable ? (
            <Text style={{ fontSize: 10.5, color: status.review.softFg, paddingLeft: 40 }}>
              {kind.unavailable}
            </Text>
          ) : null}
        </View>
      ))}
      {view.canSave ? (
        <Switch
          checked={draft.save}
          onCheckedChange={(on) => setDraft((d) => ({ ...d, save: on }))}
          label={PROOF_CHANGE_SAVE_LABEL}
        />
      ) : null}
      <TextInput
        multiline
        value={draft.note}
        maxLength={PARK_NOTE_MAX_LENGTH}
        onChangeText={(note) => setDraft((d) => ({ ...d, note }))}
        placeholder={PROOF_CHANGE_NOTE_PLACEHOLDER}
        placeholderTextColor={theme.text.muted}
        accessibilityLabel={PROOF_CHANGE_NOTE_PLACEHOLDER}
        style={{
          minHeight: 48,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[2],
          paddingHorizontal: 8,
          paddingVertical: 6,
          fontSize: 13,
          color: theme.text.primary,
        }}
      />
      {view.problem ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 11, color: theme.text.secondary }}
        >
          {view.problem}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Button size="sm" variant="primary" disabled={!view.canSend} onPress={() => onSend(draft)}>
          {PROOF_CHANGE_SEND_LABEL}
        </Button>
        <Button size="sm" variant="ghost" onPress={onCancel}>
          {PROOF_CHANGE_CANCEL_LABEL}
        </Button>
      </View>
    </View>
  )
}
