import { Text, View } from 'react-native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { chipPillStyle, chipPillTextStyle } from './pillStyles'

export interface TurnChipProps {
  turn: number
}

export default function TurnChip({ turn }: TurnChipProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={chipPillStyle(theme)}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: theme.text.muted,
        }}
      />
      <Text style={chipPillTextStyle(theme)}>T{turn}</Text>
    </View>
  )
}
