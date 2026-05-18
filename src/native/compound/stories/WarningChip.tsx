import { Text, View } from 'react-native'
import { nativePalette } from '../../../tokens/native'

export interface WarningChipProps {
  title: string
  tooltip: string
}

export default function WarningChip({ title, tooltip }: WarningChipProps) {
  return (
    <View
      accessibilityLabel={tooltip}
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: nativePalette.orange[50],
      }}
    >
      <Text
        accessibilityLabel={title}
        style={{ fontSize: 11, fontWeight: '700', color: nativePalette.orange[600] }}
      >
        !
      </Text>
    </View>
  )
}
