import { forwardRef, useState } from 'react'
import { TextInput } from 'react-native'
import type { StyleProp, TextStyle, TextInput as RNTextInput, TextInputProps } from 'react-native'
import {
  nativeLightStatus,
  nativeLightTheme,
  nativeRadii,
  nativeSpace,
} from '../../tokens/native'

export interface TextareaProps extends Omit<TextInputProps, 'multiline' | 'numberOfLines' | 'style'> {
  invalid?: boolean
  /** Visual hint for initial height. Mapped to RN's `numberOfLines` so Android
   * sizes the field accordingly; iOS approximates via min height. */
  rows?: number
  style?: StyleProp<TextStyle>
}

const APPROX_LINE_HEIGHT = 20

export const Textarea = forwardRef<RNTextInput, TextareaProps>(function Textarea(
  { invalid = false, rows = 4, style, className, onFocus, onBlur, editable, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const isDisabled = editable === false
  const borderColor = invalid
    ? nativeLightStatus.stuck.bg
    : focused
      ? nativeLightTheme.border.focus
      : nativeLightTheme.border.default

  return (
    <TextInput
      ref={ref}
      className={className}
      multiline
      numberOfLines={rows}
      editable={editable}
      placeholderTextColor={nativeLightTheme.text.muted}
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
          color: nativeLightTheme.text.primary,
          backgroundColor: nativeLightTheme.surface.raised,
          borderWidth: 1,
          borderColor,
          borderRadius: nativeRadii[2],
          paddingHorizontal: nativeSpace[6],
          paddingVertical: nativeSpace[4],
          fontSize: 14,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    />
  )
})
