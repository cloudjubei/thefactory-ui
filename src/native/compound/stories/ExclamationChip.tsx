import { Text, View } from 'react-native'
import { nativePalette } from '../../../tokens/native'

export interface ExclamationChipProps {
  title: string
  tooltip: string
}

export default function ExclamationChip({ title, tooltip }: ExclamationChipProps) {
  return (
    <View
      accessibilityLabel={tooltip}
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: nativePalette.red[50],
      }}
    >
      <Text
        accessibilityLabel={title}
        style={{ fontSize: 13, fontWeight: '700', color: nativePalette.red[600] }}
      >
        !
      </Text>
    </View>
  )
}
