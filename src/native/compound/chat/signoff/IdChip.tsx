import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { nativePalette, nativeAlpha, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type IdChipProps = {
  /** A story id is blue, a feature id green — the same scoping colour everywhere. */
  kind: 'story' | 'feature'
  children: ReactNode
}

/** The compact story/feature id bubble — the product `.id-chip`, scope-tinted. */
export default function IdChip({ kind, children }: IdChipProps) {
  const { theme } = useNativeTheme()
  const dark = theme.colorScheme === 'dark'
  const base = kind === 'story' ? nativePalette.blue : nativePalette.green
  const color = dark ? base[400] : base[800]
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 22,
        paddingHorizontal: 8,
        borderRadius: nativeRadii.round,
        borderWidth: 1,
        borderColor: dark ? nativeAlpha(base[400], 0.55) : color,
        backgroundColor: nativeAlpha(base[800], 0.06),
        maxWidth: '100%',
      }}
    >
      <Text numberOfLines={1} style={{ fontSize: 11, color, fontVariant: ['tabular-nums'] }}>
        {children}
      </Text>
    </View>
  )
}
