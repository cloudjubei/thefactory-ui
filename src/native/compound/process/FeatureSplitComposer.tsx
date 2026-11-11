import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'

import {
  FEATURE_SPLIT_CANCEL_LABEL,
  FEATURE_SPLIT_CHANGE_PROOF_LABEL,
  FEATURE_SPLIT_HEADING,
  FEATURE_SPLIT_HINT,
  FEATURE_SPLIT_MOVES_CHIP,
  FEATURE_SPLIT_NOTE_PLACEHOLDER,
  FEATURE_SPLIT_SEND_LABEL,
  FEATURE_SPLIT_STAYS_CHIP,
  FEATURE_SPLIT_TITLE_PLACEHOLDER,
  PARK_NOTE_MAX_LENGTH,
  featureSplitDraftStart,
  featureSplitView,
  toggleFeatureSplitPoint,
  toggleProofChangeKind,
  type FeatureSplitDraft,
  type FeatureSplitPointLook,
  type ProcessFeatureSplitOffer,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Switch } from '../../primitives/Switch'
import ToneBadge from '../chips/ToneBadge'

export type FeatureSplitComposerProps = {
  offer: ProcessFeatureSplitOffer
  onSend: (draft: FeatureSplitDraft) => void
  onCancel: () => void
  /** How points are picked; `switch` unless the design view switches it. */
  pointLook?: FeatureSplitPointLook
  /** Where the editor starts — the design view's states. */
  initial?: FeatureSplitDraft
}

/**
 * Native peer of web's `FeatureSplitComposer`: each acceptance point to pick,
 * how many move and stay, the follow-up's title, what proves the feature
 * changed in the same answer where the stop offers it, and why.
 */
export default function FeatureSplitComposer({
  offer,
  onSend,
  onCancel,
  pointLook = 'switch',
  initial,
}: FeatureSplitComposerProps) {
  const { theme } = useNativeTheme()
  const [draft, setDraft] = useState<FeatureSplitDraft>(
    () => initial ?? featureSplitDraftStart(offer),
  )
  const view = featureSplitView(offer, draft)
  const field = {
    borderWidth: 1,
    borderColor: theme.border.subtle,
    borderRadius: nativeRadii[2],
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: theme.text.primary,
  }

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
        {FEATURE_SPLIT_HEADING}
      </Text>
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{FEATURE_SPLIT_HINT}</Text>
      {view.points.map((point) =>
        pointLook === 'row' ? (
          <Pressable
            key={point.index}
            accessibilityRole="button"
            accessibilityState={{ selected: point.picked }}
            onPress={() => setDraft((d) => toggleFeatureSplitPoint(d, point.index))}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: nativeSpace[2],
              borderWidth: 1,
              borderRadius: nativeRadii[2],
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderColor: point.picked ? theme.accent.primary : theme.border.subtle,
              backgroundColor: point.picked ? theme.accent.softBg : theme.surface.raised,
            }}
          >
            <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>
              {point.number}. {point.text}
            </Text>
            <ToneBadge
              tone={point.picked ? 'review' : 'empty'}
              label={point.picked ? FEATURE_SPLIT_MOVES_CHIP : FEATURE_SPLIT_STAYS_CHIP}
            />
          </Pressable>
        ) : (
          <Switch
            key={point.index}
            checked={point.picked}
            onCheckedChange={() => setDraft((d) => toggleFeatureSplitPoint(d, point.index))}
            label={`${point.number}. ${point.text}`}
          />
        ),
      )}
      <Text style={{ fontSize: 11, color: theme.text.secondary }}>{view.count}</Text>
      <TextInput
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title }))}
        placeholder={FEATURE_SPLIT_TITLE_PLACEHOLDER}
        placeholderTextColor={theme.text.muted}
        accessibilityLabel={FEATURE_SPLIT_TITLE_PLACEHOLDER}
        style={field}
      />
      {view.canChangeProof ? (
        <Switch
          checked={draft.changeProof}
          onCheckedChange={(on) => setDraft((d) => ({ ...d, changeProof: on }))}
          label={FEATURE_SPLIT_CHANGE_PROOF_LABEL}
        />
      ) : null}
      {view.proof ? (
        <View style={{ gap: 6, paddingLeft: 40 }}>
          {view.proof.kinds.map((kind) => (
            <View key={kind.kind} style={{ gap: 2 }}>
              <Switch
                checked={kind.checked}
                disabled={kind.disabled}
                onCheckedChange={() =>
                  setDraft((d) =>
                    d.proof ? { ...d, proof: toggleProofChangeKind(d.proof, kind.kind) } : d,
                  )
                }
                label={kind.label}
              />
              {(kind.kept ?? kind.unavailable) ? (
                <Text style={{ fontSize: 10.5, color: theme.text.secondary, paddingLeft: 40 }}>
                  {kind.kept ?? kind.unavailable}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      <TextInput
        multiline
        value={draft.note}
        maxLength={PARK_NOTE_MAX_LENGTH}
        onChangeText={(note) => setDraft((d) => ({ ...d, note }))}
        placeholder={FEATURE_SPLIT_NOTE_PLACEHOLDER}
        placeholderTextColor={theme.text.muted}
        accessibilityLabel={FEATURE_SPLIT_NOTE_PLACEHOLDER}
        style={{ ...field, minHeight: 48 }}
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
          {FEATURE_SPLIT_SEND_LABEL}
        </Button>
        <Button size="sm" variant="ghost" onPress={onCancel}>
          {FEATURE_SPLIT_CANCEL_LABEL}
        </Button>
      </View>
    </View>
  )
}
