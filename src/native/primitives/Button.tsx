import { Children, forwardRef, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { PressableProps, View as RNView, StyleProp, ViewStyle, TextStyle } from 'react-native'
import { nativeControls, nativeLightStatus, nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import Spinner from './Spinner'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

// `asChild` (web's Radix Slot pattern) has no RN analogue and is intentionally
// omitted — render your own touchable root if Pressable doesn't fit.
export interface ButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  className?: string
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  children?: ReactNode
}

interface VariantStyle {
  container: ViewStyle
  text: TextStyle
}

function variantStyles(variant: ButtonVariant): VariantStyle {
  const { theme } = useNativeTheme()
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: theme.accent.primary, borderWidth: 0 },
        text: { color: theme.text.inverted },
      }
    case 'secondary':
      return {
        container: {
          backgroundColor: theme.surface.raised,
          borderWidth: 1,
          borderColor: theme.border.default,
        },
        text: { color: theme.text.primary },
      }
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.accent.primary,
        },
        text: { color: theme.accent.primary },
      }
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 0 },
        text: { color: theme.text.primary },
      }
    case 'danger':
      // Mirrors web's `.btn-danger`: red border, red-tinted fill, red text.
      // Uses the `stuck` status token (red-600 light / red-700 dark).
      return {
        container: {
          backgroundColor: `${nativeLightStatus.stuck.bg}1A`, // ~10% alpha
          borderWidth: 2,
          borderColor: nativeLightStatus.stuck.bg,
        },
        text: { color: nativeLightStatus.stuck.bg },
      }
    case 'success':
      // Mirrors web's `.btn-success`: green border, green-tinted fill, green
      // text. Uses the `done` status token (green-600 light / green-700 dark).
      return {
        container: {
          backgroundColor: `${nativeLightStatus.done.bg}1A`, // ~10% alpha
          borderWidth: 2,
          borderColor: nativeLightStatus.done.bg,
        },
        text: { color: nativeLightStatus.done.bg },
      }
    case 'link':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0 },
        text: { color: theme.accent.primary, textDecorationLine: 'underline' },
      }
  }
}

function sizeStyles(size: ButtonSize): VariantStyle {
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

// RN forbids raw strings/numbers as JSX children outside <Text>. Web's <button>
// happily renders mixed children like `Reindex all ({count})`, so on RN we
// auto-wrap any string/number leaves in a single <Text> next to element
// children. If every leaf is text-ish, we collapse to one <Text>.
function renderButtonChildren(children: ReactNode, textStyle: StyleProp<TextStyle>): ReactNode {
  if (children == null || typeof children === 'boolean') return null
  if (typeof children === 'string' || typeof children === 'number') {
    return <Text style={textStyle}>{children}</Text>
  }
  const arr = Children.toArray(children)
  const allTextLike = arr.every(
    (c) => typeof c === 'string' || typeof c === 'number' || isValidElement(c) === false,
  )
  if (allTextLike) {
    return <Text style={textStyle}>{arr}</Text>
  }
  return arr.map((c, i) => {
    if (typeof c === 'string' || typeof c === 'number') {
      return (
        <Text key={`t-${i}`} style={textStyle}>
          {c}
        </Text>
      )
    }
    return c
  })
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
      // Order matters: size first, variant second (so 'link' can zero out the
      // size's horizontal padding), then the consumer's `style` wins last.
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: nativeRadii[2],
          opacity: isDisabled ? 0.55 : pressed ? 0.8 : 1,
        },
        s.container,
        v.container,
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
        {renderButtonChildren(children, [s.text, v.text, textStyle])}
      </View>
    </Pressable>
  )
})

export { Button }
