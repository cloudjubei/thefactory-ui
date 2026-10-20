import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { nativePalette, nativeRadii, nativeSpace } from '../../tokens/native'
import { IconClose } from '../icons'

export type AlertVariant = 'error' | 'info'

export interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
  style?: StyleProp<ViewStyle>
  /** Shows a close button that puts the alert away. */
  onDismiss?: () => void
}

const VARIANT_STYLE: Record<AlertVariant, { backgroundColor: string; color: string }> = {
  error: { backgroundColor: nativePalette.red[50], color: nativePalette.red[700] },
  info: { backgroundColor: nativePalette.blue[50], color: nativePalette.blue[700] },
}

export default function Alert({
  variant = 'error',
  children,
  className,
  style,
  onDismiss,
}: AlertProps) {
  const v = VARIANT_STYLE[variant]
  const content =
    typeof children === 'string' ? (
      <Text style={{ fontSize: 14, color: v.color }}>{children}</Text>
    ) : (
      children
    )
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
        onDismiss ? { flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[4] } : null,
        style,
      ]}
    >
      {onDismiss ? <View style={{ flex: 1, minWidth: 0 }}>{content}</View> : content}
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={8}
          onPress={onDismiss}
        >
          <IconClose size={16} color={v.color} />
        </Pressable>
      ) : null}
    </View>
  )
}
