import { forwardRef, useState } from 'react'
import { TextInput } from 'react-native'
import type { StyleProp, TextStyle, TextInput as RNTextInput, TextInputProps } from 'react-native'
import {
  nativeControls,
  nativeLightStatus,
  nativeLightTheme,
  nativeRadii,
  nativeSpace,
} from '../../tokens/native'

export type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<TextInputProps, 'style'> {
  size?: InputSize
  invalid?: boolean
  style?: StyleProp<TextStyle>
}

function sizeStyle(size: InputSize): TextStyle {
  switch (size) {
    case 'sm':
      return { height: nativeControls.height.sm, fontSize: 13, paddingHorizontal: nativeSpace[5] }
    case 'md':
      return { height: nativeControls.height.md, fontSize: 14, paddingHorizontal: nativeSpace[6] }
    case 'lg':
      return { height: nativeControls.height.lg, fontSize: 16, paddingHorizontal: nativeSpace[7] }
  }
}

export const Input = forwardRef<RNTextInput, InputProps>(function Input(
  { size = 'md', invalid = false, style, className, onFocus, onBlur, editable, ...props },
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
      editable={editable}
      placeholderTextColor={nativeLightTheme.text.muted}
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
          color: nativeLightTheme.text.primary,
          backgroundColor: nativeLightTheme.surface.raised,
          borderWidth: 1,
          borderColor,
          borderRadius: nativeRadii[2],
          opacity: isDisabled ? 0.6 : 1,
        },
        sizeStyle(size),
        style,
      ]}
      {...props}
    />
  )
})
