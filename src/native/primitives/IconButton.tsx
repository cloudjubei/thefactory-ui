import type { ReactNode } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { nativeLightTheme, nativeRadii, nativeSpace } from '../../tokens/native'

export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps {
  children: ReactNode
  onPress?: () => void
  disabled?: boolean
  size?: IconButtonSize
  accessibilityLabel?: string
  className?: string
  style?: StyleProp<ViewStyle>
}

const HIT: Record<IconButtonSize, number> = { sm: 28, md: 32, lg: 36 }

/**
 * Borderless, transparent icon trigger. The standard "..." / icon-only
 * affordance used in headers, list rows, etc. — matches web's `HeaderMenu`
 * button (no border, no background, hover-tint only).
 *
 * Use this instead of `<Button variant="secondary" size="icon" />`, which
 * intentionally has a raised frame.
 */
export default function IconButton({
  children,
  onPress,
  disabled = false,
  size = 'md',
  accessibilityLabel,
  className,
  style,
}: IconButtonProps) {
  const d = HIT[size]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      className={className}
      style={({ pressed }) => [
        {
          width: d,
          height: d,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii[2],
          backgroundColor: pressed ? nativeLightTheme.surface.muted : 'transparent',
          opacity: disabled ? 0.5 : 1,
          padding: nativeSpace[2],
        },
        style,
      ]}
    >
      <View pointerEvents="none">{children}</View>
    </Pressable>
  )
}
