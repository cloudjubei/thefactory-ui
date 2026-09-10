import { Text, View } from 'react-native'

import { nativeAlpha, nativePalette, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'

export type DurationPillProps = {
  label: string
}

/** The standard duration pill — the run's in the head, each method's in its check block. */
export default function DurationPill({ label }: DurationPillProps) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: nativeRadii.round,
        backgroundColor: nativeAlpha(nativePalette.blue[500], 0.1),
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          fontVariant: ['tabular-nums'],
          color: theme.colorScheme === 'dark' ? nativePalette.blue[400] : nativePalette.blue[600],
        }}
      >
        {label}
      </Text>
    </View>
  )
}
