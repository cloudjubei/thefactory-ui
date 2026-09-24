import { Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativeLightStatus, nativePalette, type NativeStatusTokens } from '../../tokens/native'
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

/**
 * `green` is the status "done" token of the given theme — the one green
 * process runs use — so pass the live `useNativeTheme().status`.
 */
export function getNotificationBadgeColor(
  color: NotificationBadgeColor | undefined,
  isInformative = false,
  status: NativeStatusTokens = nativeLightStatus,
): string {
  switch (color ?? (isInformative ? 'blue' : 'red')) {
    case 'red':
      return nativePalette.red[500]
    case 'blue':
      return nativePalette.blue[500]
    case 'green':
      return status.done.bg
    case 'orange':
      return nativePalette.orange[500]
  }
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
  const { theme, status } = useNativeTheme()
  const bg = background ?? getNotificationBadgeColor(color, isInformative, status)
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
