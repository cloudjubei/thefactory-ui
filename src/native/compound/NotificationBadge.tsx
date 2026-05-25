import { Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativePalette } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type NotificationBadgeColor = 'red' | 'blue' | 'green' | 'orange'

export interface NotificationBadgeProps {
  text: string
  tooltipLabel?: string
  /** When true and `color` is unset, defaults to blue instead of red. */
  isInformative?: boolean
  color?: NotificationBadgeColor
  /** Direct override that wins over `color` — pass any RGB / hex string. */
  background?: string
  className?: string
  style?: StyleProp<ViewStyle>
}

const COLOR_HEX: Record<NotificationBadgeColor, string> = {
  red: nativePalette.red[500],
  blue: nativePalette.blue[500],
  green: nativePalette.green[500],
  orange: nativePalette.orange[500],
}

export function getNotificationBadgeColor(
  color: NotificationBadgeColor | undefined,
  isInformative = false,
): string {
  if (color) return COLOR_HEX[color]
  return isInformative ? COLOR_HEX.blue : COLOR_HEX.red
}

export default function NotificationBadge({
  text,
  tooltipLabel,
  isInformative = false,
  color,
  background,
  className,
  style,
}: NotificationBadgeProps) {
  const { theme } = useNativeTheme()
  const bg = background ?? getNotificationBadgeColor(color, isInformative)
  return (
    <View
      accessibilityLabel={tooltipLabel ?? text}
      className={className}
      style={[
        {
          height: 20,
          minWidth: 20,
          paddingHorizontal: 6,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: 2,
          borderColor: theme.surface.raised,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#ffffff' }}>{text}</Text>
    </View>
  )
}
