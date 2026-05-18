import { Text, View } from 'react-native'
import { nativeLightTheme } from '../../../tokens/native'
import { chipPillStyle, chipPillTextStyle } from './pillStyles'

export interface TurnChipProps {
  turn: number
}

export default function TurnChip({ turn }: TurnChipProps) {
  return (
    <View style={chipPillStyle}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: nativeLightTheme.text.muted,
        }}
      />
      <Text style={chipPillTextStyle}>T{turn}</Text>
    </View>
  )
}
