import { forwardRef, useState } from 'react'
import { TextInput } from 'react-native'
import type { StyleProp, TextStyle, TextInput as RNTextInput, TextInputProps } from 'react-native'
import {
  nativeControls,
  nativeLightStatus,
  nativeRadii,
  nativeSpace,
} from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'

export type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<TextInputProps, 'style' | 'editable'> {
  size?: InputSize
  invalid?: boolean
  /** API parity with web's `disabled`; maps to RN's `editable={false}`. */
  disabled?: boolean
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
  { size = 'md', invalid = false, disabled = false, style, className, onFocus, onBlur, ...props },
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
      editable={!disabled}
      placeholderTextColor={theme.text.muted}
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
          color: theme.text.primary,
          backgroundColor: theme.surface.raised,
          borderWidth: 1,
          borderColor,
          borderRadius: nativeRadii[2],
          opacity: disabled ? 0.6 : 1,
        },
        sizeStyle(size),
        style,
      ]}
      {...props}
    />
  )
})
