import { forwardRef } from 'react'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { PressableProps, View as RNView, StyleProp, ViewStyle, TextStyle } from 'react-native'
import {
  nativeControls,
  nativeLightStatus,
  nativeLightTheme,
  nativeRadii,
  nativeSpace,
} from '../../tokens/native'
import Spinner from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

// Props mirror the web Button as closely as RN allows. `onPress` is the RN
// equivalent of `onClick`; `disabled` is honoured by Pressable directly.
// `asChild` (Radix Slot pattern) has no RN analogue and is omitted; render the
// custom touchable yourself if you need a non-Pressable root.
export interface ButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  className?: string
  /** Optional override applied on top of the variant style. */
  style?: StyleProp<ViewStyle>
  /** Optional override applied to the inner text content. */
  textStyle?: StyleProp<TextStyle>
  children?: ReactNode
}

interface VariantStyle {
  container: ViewStyle
  text: TextStyle
}

function variantStyles(variant: ButtonVariant): VariantStyle {
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: nativeLightTheme.accent.primary, borderWidth: 0 },
        text: { color: nativeLightTheme.text.inverted },
      }
    case 'secondary':
      return {
        container: {
          backgroundColor: nativeLightTheme.surface.raised,
          borderWidth: 1,
          borderColor: nativeLightTheme.border.default,
        },
        text: { color: nativeLightTheme.text.primary },
      }
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: nativeLightTheme.accent.primary,
        },
        text: { color: nativeLightTheme.accent.primary },
      }
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 0 },
        text: { color: nativeLightTheme.text.primary },
      }
    case 'danger':
      return {
        container: { backgroundColor: nativeLightStatus.stuck.bg, borderWidth: 0 },
        text: { color: nativeLightStatus.stuck.fg },
      }
    case 'link':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0 },
        text: { color: nativeLightTheme.accent.primary, textDecorationLine: 'underline' },
      }
  }
}

function sizeStyles(size: ButtonSize): { container: ViewStyle; text: TextStyle } {
  switch (size) {
    case 'sm':
      return {
        container: { height: nativeControls.height.sm, paddingHorizontal: nativeSpace[6] },
        text: { fontSize: 13 },
      }
    case 'md':
      return {
        container: { height: nativeControls.height.md, paddingHorizontal: nativeControls.paddingX },
        text: { fontSize: 14 },
      }
    case 'lg':
      return {
        container: { height: nativeControls.height.lg, paddingHorizontal: nativeSpace[8] },
        text: { fontSize: 16 },
      }
    case 'icon':
      return {
        container: {
          height: nativeControls.height.md,
          width: nativeControls.height.md,
          paddingHorizontal: 0,
        },
        text: { fontSize: 14 },
      }
  }
}

const Button = forwardRef<RNView, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    children,
    className,
    style,
    textStyle,
    ...props
  },
  ref,
) {
  const v = variantStyles(variant)
  const s = sizeStyles(size)
  const isDisabled = disabled || loading

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={className}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii[2],
          opacity: isDisabled ? 0.55 : pressed ? 0.8 : 1,
        },
        v.container,
        s.container,
        style,
      ]}
      {...props}
    >
      {loading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinner size={16} color={v.text.color as string | undefined} />
        </View>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[3],
          opacity: loading ? 0 : 1,
        }}
      >
        {typeof children === 'string' ? (
          <Text style={[v.text, s.text, textStyle]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  )
})

export { Button }
