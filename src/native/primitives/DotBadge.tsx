import { View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativeLightStatus, nativeLightTheme } from '../../tokens/native'

export interface DotBadgeProps {
  color?: string
  size?: number
  ringColor?: string
  ringWidth?: number
  className?: string
  style?: StyleProp<ViewStyle>
}

export default function DotBadge({
  color = nativeLightStatus.stuck.bg,
  size = 10,
  ringColor = nativeLightTheme.surface.raised,
  ringWidth = 2,
  className,
  style,
}: DotBadgeProps) {
  return (
    <View
      className={className}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: ringWidth,
          borderColor: ringColor,
        },
        style,
      ]}
    />
  )
}
