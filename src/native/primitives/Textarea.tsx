import { forwardRef, useState } from 'react'
import { TextInput } from 'react-native'
import type { StyleProp, TextStyle, TextInput as RNTextInput, TextInputProps } from 'react-native'
import { nativeLightStatus, nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export interface TextareaProps extends Omit<
  TextInputProps,
  'multiline' | 'numberOfLines' | 'style' | 'editable'
> {
  invalid?: boolean
  /** Initial height in lines. Android honours via `numberOfLines`; iOS
   * approximates via `minHeight`. */
  rows?: number
  /** API parity with web's `disabled`; maps to RN's `editable={false}`. */
  disabled?: boolean
  style?: StyleProp<TextStyle>
}

const APPROX_LINE_HEIGHT = 20

export const Textarea = forwardRef<RNTextInput, TextareaProps>(function Textarea(
  { invalid = false, rows = 4, disabled = false, style, className, onFocus, onBlur, ...props },
  ref,
) {
  const { theme } = useNativeTheme()
  const [focused, setFocused] = useState(false)
  const borderColor = invalid
    ? nativeLightStatus.stuck.bg
    : focused
      ? theme.border.focus
      : theme.border.default

  return (
    <TextInput
      ref={ref}
      className={className}
      multiline
      numberOfLines={rows}
      editable={!disabled}
      placeholderTextColor={theme.text.muted}
      textAlignVertical="top"
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      style={[
        {
          width: '100%',
          minHeight: rows * APPROX_LINE_HEIGHT + nativeSpace[8],
          color: theme.text.primary,
          backgroundColor: theme.surface.raised,
          borderWidth: 1,
          borderColor,
          borderRadius: nativeRadii[2],
          paddingHorizontal: nativeSpace[6],
          paddingVertical: nativeSpace[4],
          fontSize: 14,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    />
  )
})
