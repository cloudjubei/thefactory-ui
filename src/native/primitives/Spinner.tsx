import { ActivityIndicator, Text, View } from 'react-native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export interface SpinnerProps {
  /** Size in dp; iOS clamps numeric sizes to its system default. */
  size?: number
  color?: string
  /** Optional caption rendered to the right of the spinner. */
  label?: string
  className?: string
}

export default function Spinner({
  size = 16,
  color,
  label,
  className,
}: SpinnerProps) {
  const { theme } = useNativeTheme()
  const resolvedColor = color ?? theme.text.muted
  if (!label) {
    return (
      <ActivityIndicator
        size={size}
        color={resolvedColor}
        className={className}
        accessibilityLabel="Loading"
      />
    )
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className={className}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <ActivityIndicator size={size} color={resolvedColor} />
      <Text style={{ fontSize: 14, color: theme.text.muted }}>{label}</Text>
    </View>
  )
}
