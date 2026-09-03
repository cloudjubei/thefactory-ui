import { ActivityIndicator, Text, View } from 'react-native'
import Tooltip from '../../primitives/Tooltip'
import {
  nativePalette,
  nativeRadii,
  nativeSpace,
  type NativeSemanticTheme,
} from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

// Library-internal status union. The original `ChatState` from `thefactory-tools`
// reduces to exactly this set; keeping it local keeps the package uncoupled.
export type ChipState = 'created' | 'running' | 'completed' | 'cancelled' | 'error'

export interface StatusChipProps {
  state: ChipState
  label?: string
}

function stateColors(
  theme: NativeSemanticTheme,
): Record<ChipState, { bg: string; fg: string; border: string }> {
  return {
    created: {
      bg: theme.surface.muted,
      fg: theme.text.secondary,
      border: theme.border.subtle,
    },
    running: {
      bg: nativePalette.blue[100],
      fg: nativePalette.blue[800],
      border: nativePalette.blue[200],
    },
    completed: {
      bg: nativePalette.green[100],
      fg: nativePalette.green[800],
      border: nativePalette.green[200],
    },
    cancelled: {
      bg: theme.surface.muted,
      fg: theme.text.secondary,
      border: theme.border.subtle,
    },
    error: {
      bg: nativePalette.red[100],
      fg: nativePalette.red[800],
      border: nativePalette.red[200],
    },
  }
}

function StateGlyph({ state, color }: { state: ChipState; color: string }) {
  if (state === 'running') return <ActivityIndicator size={12} color={color} />
  const glyph =
    state === 'completed' ? '✓' : state === 'error' ? '✗' : state === 'cancelled' ? '◯' : '○'
  return <Text style={{ fontSize: 12, lineHeight: 14, color }}>{glyph}</Text>
}

export default function StatusChip({ state, label }: StatusChipProps) {
  const { theme } = useNativeTheme()
  const text = label ?? state
  const colors = stateColors(theme)[state]
  return (
    <Tooltip content={<Text style={{ fontSize: 12, color: theme.text.primary }}>{text}</Text>}>
      <View
        accessibilityLabel={text}
        accessibilityState={state === 'running' ? { busy: true } : undefined}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[5],
          paddingVertical: 2,
          borderRadius: nativeRadii.round,
          backgroundColor: colors.bg,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <StateGlyph state={state} color={colors.fg} />
      </View>
    </Tooltip>
  )
}
