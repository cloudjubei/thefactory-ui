import { View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativeLightStatus } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

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
  ringColor,
  ringWidth = 2,
  className,
  style,
}: DotBadgeProps) {
  const { theme } = useNativeTheme()
  const resolvedRingColor = ringColor ?? theme.surface.raised
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
          borderColor: resolvedRingColor,
        },
        style,
      ]}
    />
  )
}
