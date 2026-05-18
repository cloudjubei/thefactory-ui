import { ActivityIndicator, Text, View } from 'react-native'
import { nativeLightTheme } from '../../tokens/native'

export interface SpinnerProps {
  /**
   * Size in dp. Maps to RN's `ActivityIndicator size` prop. Note iOS clamps
   * arbitrary numeric sizes to its system default; on Android numeric sizes
   * are honoured directly.
   */
  size?: number
  /** Stroke colour; defaults to the package's `--text-muted` light token. */
  color?: string
  /**
   * Optional caption rendered to the right of the spinner. Mirrors the web
   * peer's API — when set, the component returns a row containing both
   * elements.
   */
  label?: string
  className?: string
}

export default function Spinner({
  size = 16,
  color = nativeLightTheme.text.muted,
  label,
  className,
}: SpinnerProps) {
  if (!label) {
    return <ActivityIndicator size={size} color={color} className={className} accessibilityLabel="Loading" />
  }

  return (
    <View
      className={className}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size={size} color={color} />
      <Text style={{ fontSize: 14, color: nativeLightTheme.text.muted }}>{label}</Text>
    </View>
  )
}
