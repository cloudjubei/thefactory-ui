import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  FEATURE_PROCESS_DEFAULT_TAG,
  FEATURE_PROCESS_EXTEND_NOTE,
  FEATURE_PROCESS_FIX_NOTE,
  FEATURE_PROCESS_QUESTION,
  featureProcessOptions,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type FeatureProcessChooserProps = {
  /** The way chosen so far — the story process's own until the person picks. */
  choice: string | undefined
  /** The way the story's process works its features when nobody picks. */
  defaultChoice?: string
  /** The new features join an open run, which works them its own way: nothing to choose. */
  joinsOpenRun?: boolean
  busy?: boolean
  onChoose: (processId: string) => void
}

/**
 * Native peer of [web's `FeatureProcessChooser`](../../../web/compound/chat/FeatureProcessChooser.tsx):
 * one chip naming how the story's features are worked; tapping it lists the
 * ways, each with what it means, in place under it.
 */
export default function FeatureProcessChooser({
  choice,
  defaultChoice,
  joinsOpenRun = false,
  busy = false,
  onChoose,
}: FeatureProcessChooserProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(false)
  const options = featureProcessOptions()
  const picked = options.find((o) => o.processId === choice) ?? options[0]

  if (joinsOpenRun) {
    return (
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>
        {FEATURE_PROCESS_EXTEND_NOTE}
      </Text>
    )
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: busy }}
        accessibilityLabel={`${FEATURE_PROCESS_QUESTION}: ${picked?.label ?? ''}`}
        disabled={busy}
        onPress={() => setOpen((v) => !v)}
        style={{
          alignSelf: 'flex-start',
          minHeight: 36,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: theme.accent.primary,
          backgroundColor: theme.surface.raised,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text.primary }}>
          {picked?.label}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={FEATURE_PROCESS_QUESTION}
          style={{
            borderWidth: 1,
            borderColor: theme.border.default,
            borderRadius: nativeRadii[3],
            overflow: 'hidden',
          }}
        >
          {options.map((option, i) => {
            const selected = option.processId === picked?.processId
            return (
              <Pressable
                key={option.processId}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onChoose(option.processId)
                  setOpen(false)
                }}
                style={{
                  minHeight: 56,
                  gap: 2,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: theme.border.subtle,
                  backgroundColor: selected ? theme.surface.muted : theme.surface.raised,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text.primary }}>
                    {option.label}
                  </Text>
                  {option.processId === defaultChoice ? (
                    <Text
                      style={{
                        fontSize: 10,
                        color: theme.text.secondary,
                        borderWidth: 1,
                        borderColor: theme.border.default,
                        borderRadius: nativeRadii.round,
                        paddingHorizontal: 6,
                      }}
                    >
                      {FEATURE_PROCESS_DEFAULT_TAG}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 12, lineHeight: 17, color: theme.text.secondary }}>
                  {option.detail}
                </Text>
              </Pressable>
            )
          })}
          <Text
            style={{
              fontSize: 10.5,
              color: theme.text.muted,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {FEATURE_PROCESS_FIX_NOTE}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
