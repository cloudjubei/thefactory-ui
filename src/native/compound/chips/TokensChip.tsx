import { Text, View } from 'react-native'
import Tooltip from '../../primitives/Tooltip'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export interface TokensChipProps {
  prompt: number
  completion: number
  averages?: {
    userMessages?: number
    assistantMessages?: number
    avgPromptPerUser?: number
    avgCompletionPerAssistant?: number
  }
}

export default function TokensChip({ prompt, completion, averages }: TokensChipProps) {
  const { theme } = useNativeTheme()
  const tooltipBody = (
    <View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary }}>
        Token usage
      </Text>
      <Text
        style={{
          marginTop: nativeSpace[2],
          fontSize: 12,
          color: theme.text.secondary,
        }}
      >
        Prompt: {prompt} · Completion: {completion} · Total: {prompt + completion}
      </Text>
      {averages && (
        <View style={{ marginTop: nativeSpace[3], gap: 2 }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Per-message averages
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            User ({averages.userMessages ?? 0}):{' '}
            {averages.avgPromptPerUser != null ? `${averages.avgPromptPerUser} tokens/msg` : '—'} ·
            Assistant ({averages.assistantMessages ?? 0}):{' '}
            {averages.avgCompletionPerAssistant != null
              ? `${averages.avgCompletionPerAssistant} tokens/msg`
              : '—'}
          </Text>
        </View>
      )}
    </View>
  )

  return (
    <Tooltip content={tooltipBody}>
      <View
        style={{
          alignItems: 'flex-start',
          gap: 2,
          paddingHorizontal: nativeSpace[5],
          paddingVertical: nativeSpace[2],
          borderRadius: nativeRadii.round,
          backgroundColor: theme.surface.muted,
          borderWidth: 1,
          borderColor: theme.border.subtle,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 10, color: theme.text.muted }}>←</Text>
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>{prompt}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
          <Text style={{ fontSize: 10, color: theme.text.muted }}>→</Text>
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>{completion}</Text>
        </View>
      </View>
    </Tooltip>
  )
}
