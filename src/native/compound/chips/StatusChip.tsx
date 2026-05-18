import { ActivityIndicator, Text, View } from 'react-native'
import Tooltip from '../../primitives/Tooltip'
import { nativeLightTheme, nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'

// Library-internal status union. The original `ChatState` from `thefactory-tools`
// reduces to exactly this set; keeping it local keeps the package uncoupled.
export type ChipState = 'created' | 'running' | 'completed' | 'cancelled' | 'error'

export interface StatusChipProps {
  state: ChipState
  label?: string
}

const STATE_COLORS: Record<ChipState, { bg: string; fg: string; border: string }> = {
  created: {
    bg: nativeLightTheme.surface.muted,
    fg: nativeLightTheme.text.secondary,
    border: nativeLightTheme.border.subtle,
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
    bg: nativeLightTheme.surface.muted,
    fg: nativeLightTheme.text.secondary,
    border: nativeLightTheme.border.subtle,
  },
  error: {
    bg: nativePalette.red[100],
    fg: nativePalette.red[800],
    border: nativePalette.red[200],
  },
}

function StateGlyph({ state, color }: { state: ChipState; color: string }) {
  if (state === 'running') return <ActivityIndicator size={12} color={color} />
  const glyph =
    state === 'completed' ? '✓' : state === 'error' ? '✗' : state === 'cancelled' ? '◯' : '○'
  return <Text style={{ fontSize: 12, lineHeight: 14, color }}>{glyph}</Text>
}

export default function StatusChip({ state, label }: StatusChipProps) {
  const text = label ?? state
  const colors = STATE_COLORS[state]
  return (
    <Tooltip
      content={
        <Text style={{ fontSize: 12, color: nativeLightTheme.text.primary }}>{text}</Text>
      }
    >
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
