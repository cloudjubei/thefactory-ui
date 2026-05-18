import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativePalette, nativeRadii, nativeSpace } from '../../tokens/native'

export type AlertVariant = 'error' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
}

const VARIANT_STYLE: Record<AlertVariant, { backgroundColor: string; color: string }> = {
  error: { backgroundColor: nativePalette.red[50], color: nativePalette.red[700] },
  info: { backgroundColor: nativePalette.blue[50], color: nativePalette.blue[700] },
}

export default function Alert({ variant = 'error', children, className, style }: AlertProps) {
  const v = VARIANT_STYLE[variant]
  return (
    <View
      className={className}
      accessibilityRole={variant === 'error' ? 'alert' : 'text'}
      style={[
        {
          paddingHorizontal: nativeSpace[6],
          paddingVertical: nativeSpace[4],
          borderRadius: nativeRadii[1],
          backgroundColor: v.backgroundColor,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={{ fontSize: 14, color: v.color }}>{children}</Text>
      ) : (
        children
      )}
    </View>
  )
}
