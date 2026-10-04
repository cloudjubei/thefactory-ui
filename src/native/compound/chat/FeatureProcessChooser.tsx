import { Pressable, Text, View } from 'react-native'

import {
  FEATURE_PROCESS_EXTEND_NOTE,
  FEATURE_PROCESS_FIX_NOTE,
  FEATURE_PROCESS_QUESTION,
  featureProcessOptions,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type FeatureProcessChooserProps = {
  /** The way chosen so far — the story process's own until the person picks. */
  choice: string | undefined
  /** The new features join an open run, which works them its own way: nothing to choose. */
  joinsOpenRun?: boolean
  busy?: boolean
  onChoose: (processId: string) => void
}

/**
 * How the story's features are worked: a developer then a separate verifier,
 * or one agent that implements and proves its own change. The person's choice,
 * carried on the launch decision. Web peer: `web/compound/chat/FeatureProcessChooser`.
 */
export default function FeatureProcessChooser({
  choice,
  joinsOpenRun = false,
  busy = false,
  onChoose,
}: FeatureProcessChooserProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={FEATURE_PROCESS_QUESTION}
      style={{
        gap: 6,
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        borderRadius: nativeRadii[2],
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: theme.text.muted,
        }}
      >
        {FEATURE_PROCESS_QUESTION}
      </Text>
      {joinsOpenRun ? (
        <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
          {FEATURE_PROCESS_EXTEND_NOTE}
        </Text>
      ) : (
        <>
          <View style={{ gap: 6 }}>
            {featureProcessOptions().map((option) => {
              const picked = choice === option.processId
              return (
                <Pressable
                  key={option.processId}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: picked, disabled: busy }}
                  disabled={busy}
                  onPress={() => onChoose(option.processId)}
                  style={{
                    gap: 2,
                    borderWidth: 1,
                    borderColor: picked ? theme.accent.primary : theme.border.default,
                    backgroundColor: theme.surface.raised,
                    borderRadius: nativeRadii[2],
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}>
                      {option.label}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.text.secondary }}>
                    {option.detail}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={{ fontSize: 10.5, color: theme.text.muted }}>
            {FEATURE_PROCESS_FIX_NOTE}
          </Text>
        </>
      )}
    </View>
  )
}
